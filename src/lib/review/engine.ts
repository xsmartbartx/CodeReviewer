import type { FindingCounts } from "@/db/schema";
import { loadRepoConfig, type LoadedConfig } from "@/lib/config/load";
import { matchesAny } from "@/lib/config/paths";
import type { ReviewConfig } from "@/lib/config/schema";
import type { ChangedFile, GitHubPort, PullRequestInfo, ReviewComment } from "@/lib/github/port";
import { batchFiles, DEFAULT_LIMITS, selectFiles, type ReviewableFile, type SelectionLimits } from "./files";
import { processFindings } from "./findings";
import { commentBody, countsLine, reviewBody } from "./format";
import { ModelRefusalError, type ReviewModel, type Usage } from "./model";
import { buildBatchPrompt, buildSummaryPrompt, type BatchResult, type Finding } from "./prompt";

export type EngineInput = {
  prNumber: number;
  trigger: "auto" | "command";
  full: boolean;
  /** Head commit of the last completed review of this PR, for incremental reviews. */
  lastReviewedSha: string | null;
  limits?: SelectionLimits;
};

export type EngineDeps = {
  github: GitHubPort;
  model: ReviewModel;
  slug: string;
  detailsUrl?: string;
};

export type EngineOutcome =
  | { status: "skipped"; reason: string; pr: PullRequestInfo }
  | {
      status: "completed";
      pr: PullRequestInfo;
      baseSha: string | null;
      filesReviewed: number;
      commentsPosted: number;
      counts: FindingCounts;
      summary: string | null;
      usage: Usage;
      githubReviewId: number;
    };

const BATCH_CONCURRENCY = 3;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Reasons an automatic review should not run, from the repo's auto_review settings. */
export function autoReviewSkipReason(pr: PullRequestInfo, config: ReviewConfig): string | null {
  const auto = config.auto_review;
  if (!auto.enabled) return "Automatic reviews are disabled in the repository config.";
  if (pr.draft && !auto.drafts) return "Draft pull request.";
  const title = pr.title.toLowerCase();
  const keyword = auto.ignore_title_keywords.find((k) => k.trim() && title.includes(k.toLowerCase()));
  if (keyword) return `Title contains "${keyword}".`;
  if (auto.ignore_authors.some((a) => a.toLowerCase() === pr.author.toLowerCase())) {
    return `Author ${pr.author} is ignored.`;
  }
  if (auto.base_branches.length && !matchesAny(pr.baseRef, auto.base_branches)) {
    return `Base branch ${pr.baseRef} is not configured for reviews.`;
  }
  return null;
}

function configNotice(loaded: LoadedConfig): string | null {
  const notes: string[] = [];
  if (loaded.source === "coderabbit") {
    notes.push(
      `Using the compatible settings from \`${loaded.path}\`. Add a \`.codereviewer.yaml\` to configure CodeReviewer directly.`,
    );
  }
  if (loaded.errors.length) {
    notes.push(
      `Problems in \`${loaded.path}\` (defaults used for these fields): ${loaded.errors.map((e) => `\`${e}\``).join(", ")}`,
    );
  }
  return notes.length ? notes.join(" ") : null;
}

/** For pull requests from forks, read config from the base branch so the author cannot rewrite review rules. */
function configRef(pr: PullRequestInfo): string {
  return pr.headRepoFullName === pr.baseRepoFullName ? pr.headSha : pr.baseSha;
}

export async function runReview(input: EngineInput, deps: EngineDeps): Promise<EngineOutcome> {
  const { github } = deps;
  const pr = await github.getPullRequest(input.prNumber);
  if (pr.state !== "open") return { status: "skipped", reason: "Pull request is closed.", pr };

  const loaded = await loadRepoConfig((path) => github.getFileContent(path, configRef(pr)));
  const config = loaded.config;

  if (input.trigger === "auto") {
    const reason = autoReviewSkipReason(pr, config);
    if (reason) return { status: "skipped", reason, pr };
  }

  if (!input.full && input.lastReviewedSha === pr.headSha) {
    if (input.trigger === "command") {
      await github.createIssueComment(
        pr.number,
        `No new commits since the last review. Comment \`@${deps.slug} full review\` to review the whole pull request again.`,
      );
    }
    return { status: "skipped", reason: "No new commits since the last review.", pr };
  }

  // Incremental: only what changed since the last reviewed commit. A force push makes the
  // old commit unreachable, so compareCommits returns null and we review everything.
  let changed: ChangedFile[] | null = null;
  let baseSha: string | null = null;
  const incremental =
    !input.full && input.lastReviewedSha && (config.auto_review.incremental || input.trigger === "command");
  if (incremental && input.lastReviewedSha) {
    changed = await github.compareCommits(input.lastReviewedSha, pr.headSha);
    if (changed) baseSha = input.lastReviewedSha;
  }
  changed ??= await github.listPullRequestFiles(pr.number);

  const { files, skipped } = selectFiles(changed, config, input.limits ?? DEFAULT_LIMITS);
  if (files.length === 0) {
    if (input.trigger === "command") {
      await github.createIssueComment(pr.number, "There are no reviewable changes in this pull request.");
    }
    return { status: "skipped", reason: "No reviewable files.", pr };
  }

  const checkRunId = await github.createCheckRun({
    headSha: pr.headSha,
    title: "Reviewing",
    summary: `Reviewing ${files.length} file${files.length === 1 ? "" : "s"}.`,
  });

  try {
    return await reviewFiles(pr, files, skipped, loaded, baseSha, checkRunId, deps);
  } catch (error) {
    if (checkRunId !== null) {
      await github
        .completeCheckRun(checkRunId, {
          conclusion: "neutral",
          title: "Review failed",
          summary: "The review could not be completed. It will be retried automatically.",
          detailsUrl: deps.detailsUrl,
        })
        .catch(() => undefined);
    }
    throw error;
  }
}

async function reviewFiles(
  pr: PullRequestInfo,
  files: ReviewableFile[],
  skipped: ReturnType<typeof selectFiles>["skipped"],
  loaded: LoadedConfig,
  baseSha: string | null,
  checkRunId: number | null,
  deps: EngineDeps,
): Promise<EngineOutcome> {
  const { github, model } = deps;
  const config = loaded.config;
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const batches = batchFiles(files);

  const results = await mapLimit(batches, BATCH_CONCURRENCY, async (batch) => {
    try {
      const { result, usage: u } = await model.reviewBatch(buildBatchPrompt(pr, config, batch));
      usage.inputTokens += u.inputTokens;
      usage.outputTokens += u.outputTokens;
      return { ok: true as const, result, batch };
    } catch (error) {
      if (error instanceof ModelRefusalError) return { ok: false as const, error: error.message, batch };
      throw error;
    }
  });

  const succeeded = results.filter((r) => r.ok) as Array<{ ok: true; result: BatchResult; batch: ReviewableFile[] }>;
  const failed = results.filter((r) => !r.ok) as Array<{ ok: false; error: string; batch: ReviewableFile[] }>;
  if (succeeded.length === 0) {
    throw new Error(failed[0]?.error ?? "No part of the review succeeded.");
  }

  const reviewedPaths = new Set(succeeded.flatMap((r) => r.batch.map((f) => f.path)));
  const reviewed = files.filter((f) => reviewedPaths.has(f.path));
  const findings: Finding[] = succeeded.flatMap((r) => r.result.findings);

  let summary: string | null = succeeded[0]?.result.summary ?? null;
  if (succeeded.length > 1 && config.summary) {
    try {
      const s = await model.summarize(
        buildSummaryPrompt(
          pr,
          config,
          succeeded.map((r) => r.result.summary),
        ),
      );
      usage.inputTokens += s.usage.inputTokens;
      usage.outputTokens += s.usage.outputTokens;
      summary = s.summary;
    } catch {
      summary = succeeded.map((r) => r.result.summary).join("\n\n");
    }
  }

  const fileSummaries = new Map(succeeded.flatMap((r) => r.result.files.map((f) => [f.path, f.summary] as const)));
  const walkthrough = config.walkthrough
    ? reviewed.map((f) => ({ path: f.path, summary: fileSummaries.get(f.path) ?? "" }))
    : null;

  const { comments, bodyOnly, counts } = processFindings(findings, reviewed, {
    profile: config.profile,
    maxComments: config.max_comments,
  });

  const blocking = counts.critical + counts.major > 0;
  const event = config.request_changes && blocking ? "REQUEST_CHANGES" : "COMMENT";
  const bodyInput = {
    summary,
    showSummary: config.summary,
    walkthrough,
    counts,
    skipped,
    configNotice: configNotice(loaded),
    failedParts: failed.map((f) => `${f.error} (${f.batch.map((b) => `\`${b.path}\``).join(", ")})`),
    range: { from: baseSha, to: pr.headSha },
    slug: deps.slug,
  };
  const inline: ReviewComment[] = comments.map((f) => ({
    path: f.path,
    line: f.line,
    side: "RIGHT",
    startLine: f.start_line ?? undefined,
    body: commentBody(f),
  }));

  let posted: { id: number };
  let commentsPosted = inline.length;
  try {
    posted = await github.createReview(pr.number, {
      commitId: pr.headSha,
      event,
      body: reviewBody({ ...bodyInput, bodyOnly }),
      comments: inline,
    });
  } catch (error) {
    // GitHub rejects the whole review if any comment targets a line outside the diff
    // (for example after a push that raced the review). Fall back to a body-only review.
    if (!inline.length || (error as { status?: number }).status !== 422) throw error;
    posted = await github.createReview(pr.number, {
      commitId: pr.headSha,
      event,
      body: reviewBody({ ...bodyInput, bodyOnly: [...comments, ...bodyOnly] }),
      comments: [],
    });
    commentsPosted = 0;
  }

  if (checkRunId !== null) {
    await github.completeCheckRun(checkRunId, {
      conclusion: config.request_changes && blocking ? "failure" : "success",
      title: countsLine(counts).replace(/[✅]/g, "").trim(),
      summary: summary ?? "Review complete.",
      detailsUrl: deps.detailsUrl,
    });
  }

  return {
    status: "completed",
    pr,
    baseSha,
    filesReviewed: reviewed.length,
    commentsPosted,
    counts,
    summary,
    usage,
    githubReviewId: posted.id,
  };
}
