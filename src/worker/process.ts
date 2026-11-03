import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, repositories, reviews } from "@/db/schema";
import { effectivePlan, periodStart } from "@/lib/billing/plans";
import { env, plansEnforced, requireGitHub } from "@/lib/env";
import { repoPort } from "@/lib/github/app";
import { linkedOrgPlan } from "@/lib/nexora/org-plans";
import type { GitHubPort } from "@/lib/github/port";
import type { ReviewJob } from "@/lib/queue";
import { runReview } from "@/lib/review/engine";
import { DEFAULT_LIMITS } from "@/lib/review/files";
import { ClaudeReviewModel, type ReviewModel } from "@/lib/review/model";
import { lastReviewedSha, reviewsUsed } from "@/lib/usage";

export type ProcessDeps = {
  portFor: (installationId: number, owner: string, repo: string) => Promise<GitHubPort>;
  model: () => ReviewModel;
  billing: boolean;
};

export const defaultProcessDeps = (): ProcessDeps => ({
  portFor: repoPort,
  model: () => new ClaudeReviewModel(),
  billing: plansEnforced(),
});

export type ProcessResult = { status: "ignored" | "quota" | "skipped" | "completed"; reviewId?: string };

export async function processReviewJob(
  job: ReviewJob,
  deps: ProcessDeps = defaultProcessDeps(),
  jobId?: string,
): Promise<ProcessResult> {
  const { APP_URL } = env();
  const [account] = await db().select().from(accounts).where(eq(accounts.installationId, job.installationId));
  const [repo] = await db().select().from(repositories).where(eq(repositories.githubRepoId, job.repoGithubId));
  if (!account || account.installationSuspended || !repo || !repo.enabled || !repo.active) {
    return { status: "ignored" };
  }

  const github = await deps.portFor(job.installationId, job.owner, job.repo);
  const plan = effectivePlan(account, deps.billing, await linkedOrgPlan(account));

  if ((await reviewsUsed(account.id)) >= plan.reviewsPerMonth) {
    // Tell the PR once per period instead of on every push.
    const [notified] = await db()
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.repositoryId, repo.id),
          eq(reviews.prNumber, job.prNumber),
          eq(reviews.skipReason, "quota"),
          gte(reviews.createdAt, periodStart()),
        ),
      )
      .limit(1);
    if (!notified) {
      const pr = await github.getPullRequest(job.prNumber);
      await db().insert(reviews).values({
        accountId: account.id,
        repositoryId: repo.id,
        prNumber: job.prNumber,
        prTitle: pr.title,
        prAuthor: pr.author,
        headSha: pr.headSha,
        status: "skipped",
        trigger: job.trigger,
        skipReason: "quota",
      });
      await github.createIssueComment(
        job.prNumber,
        `**${account.login}** has used all ${plan.reviewsPerMonth} reviews included in the ${plan.name} plan this month, so this pull request was not reviewed. [Upgrade your plan](${APP_URL}/dashboard/${account.login}/billing) to keep reviewing, or wait until the quota resets on the 1st.`,
      );
    }
    return { status: "quota" };
  }

  const previous = job.full ? null : await lastReviewedSha(repo.id, job.prNumber);
  const startedAt = new Date();
  const [row] = await db()
    .insert(reviews)
    .values({
      jobId,
      accountId: account.id,
      repositoryId: repo.id,
      prNumber: job.prNumber,
      headSha: previous ?? "pending",
      status: "running",
      trigger: job.trigger,
      startedAt,
    })
    .onConflictDoUpdate({
      target: reviews.jobId,
      set: { status: "running", error: null, startedAt, completedAt: null },
    })
    .returning({ id: reviews.id });
  const reviewId = row!.id;
  const model = deps.model();

  try {
    const outcome = await runReview(
      {
        prNumber: job.prNumber,
        trigger: job.trigger,
        full: job.full,
        lastReviewedSha: previous,
        limits: { ...DEFAULT_LIMITS, maxFiles: plan.maxFilesPerReview },
      },
      {
        github,
        model,
        slug: requireGitHub().slug,
        detailsUrl: `${APP_URL}/dashboard/${account.login}/reviews/${reviewId}`,
      },
    );

    const common = {
      prTitle: outcome.pr.title,
      prAuthor: outcome.pr.author,
      headSha: outcome.pr.headSha,
      completedAt: new Date(),
    };
    if (outcome.status === "skipped") {
      await db()
        .update(reviews)
        .set({ ...common, status: "skipped", skipReason: outcome.reason })
        .where(eq(reviews.id, reviewId));
      return { status: "skipped", reviewId };
    }
    await db()
      .update(reviews)
      .set({
        ...common,
        status: "completed",
        baseSha: outcome.baseSha,
        filesReviewed: outcome.filesReviewed,
        commentsPosted: outcome.commentsPosted,
        findingCounts: outcome.counts,
        summary: outcome.summary,
        model: model.name,
        inputTokens: outcome.usage.inputTokens,
        outputTokens: outcome.usage.outputTokens,
        githubReviewId: outcome.githubReviewId,
      })
      .where(eq(reviews.id, reviewId));
    return { status: "completed", reviewId };
  } catch (error) {
    await db()
      .update(reviews)
      .set({ status: "failed", error: (error as Error).message.slice(0, 2000), completedAt: new Date() })
      .where(eq(reviews.id, reviewId));
    throw error;
  }
}
