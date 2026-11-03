import { App, Octokit, RequestError } from "octokit";
import { env } from "@/lib/env";
import type { ChangedFile, FileStatus, GitHubPort } from "./port";

export const CHECK_RUN_NAME = "CodeReviewer";
const MAX_FILES = 3000; // GitHub's hard limit for the PR files endpoint.

let app: InstanceType<typeof App> | undefined;

export function githubApp() {
  if (!app) {
    const e = env();
    app = new App({
      appId: e.GITHUB_APP_ID,
      privateKey: e.GITHUB_APP_PRIVATE_KEY,
      oauth: { clientId: e.GITHUB_CLIENT_ID, clientSecret: e.GITHUB_CLIENT_SECRET },
    });
  }
  return app;
}

export type InstallationOctokit = Awaited<ReturnType<ReturnType<typeof githubApp>["getInstallationOctokit"]>>;

export function installUrl(): string {
  return `https://github.com/apps/${env().GITHUB_APP_SLUG}/installations/new`;
}

type RawFile = {
  filename: string;
  previous_filename?: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

function toChangedFile(f: RawFile): ChangedFile {
  return {
    path: f.filename,
    previousPath: f.previous_filename,
    status: f.status as FileStatus,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  };
}

function isNotFound(error: unknown): boolean {
  return error instanceof RequestError && error.status === 404;
}

export function createGitHubPort(octokit: Octokit | InstallationOctokit, owner: string, repo: string): GitHubPort {
  const kit = octokit as Octokit;
  return {
    async getPullRequest(prNumber) {
      const { data } = await kit.rest.pulls.get({ owner, repo, pull_number: prNumber });
      return {
        number: data.number,
        title: data.title,
        body: data.body ?? "",
        draft: Boolean(data.draft),
        state: data.state as "open" | "closed",
        headSha: data.head.sha,
        headRef: data.head.ref,
        headRepoFullName: data.head.repo?.full_name ?? null,
        baseSha: data.base.sha,
        baseRef: data.base.ref,
        baseRepoFullName: data.base.repo.full_name,
        author: data.user?.login ?? "ghost",
        authorIsBot: data.user?.type === "Bot",
        htmlUrl: data.html_url,
      };
    },

    async listPullRequestFiles(prNumber) {
      const files = await kit.paginate(kit.rest.pulls.listFiles, { owner, repo, pull_number: prNumber, per_page: 100 });
      return files.slice(0, MAX_FILES).map(toChangedFile);
    },

    async compareCommits(base, head) {
      try {
        const { data } = await kit.rest.repos.compareCommitsWithBasehead({
          owner,
          repo,
          basehead: `${base}...${head}`,
        });
        if (data.status !== "ahead" && data.status !== "identical") return null;
        return (data.files ?? []).map(toChangedFile);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async getFileContent(path, ref) {
      try {
        const { data } = await kit.rest.repos.getContent({ owner, repo, path, ref });
        if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return null;
        return Buffer.from(data.content, "base64").toString("utf8");
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async createReview(prNumber, review) {
      const { data } = await kit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: review.commitId,
        body: review.body,
        event: review.event,
        comments: review.comments.map((c) => ({
          path: c.path,
          line: c.line,
          side: c.side,
          ...(c.startLine && c.startLine < c.line ? { start_line: c.startLine, start_side: c.side } : {}),
          body: c.body,
        })),
      });
      return { id: data.id };
    },

    async createIssueComment(prNumber, body) {
      await kit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
    },

    async addCommentReaction(commentId, content) {
      await kit.rest.reactions.createForIssueComment({ owner, repo, comment_id: commentId, content });
    },

    async createCheckRun({ headSha, title, summary }) {
      try {
        const { data } = await kit.rest.checks.create({
          owner,
          repo,
          name: CHECK_RUN_NAME,
          head_sha: headSha,
          status: "in_progress",
          output: { title, summary },
        });
        return data.id;
      } catch (error) {
        // Installations that predate the checks permission cannot create runs; reviews still work.
        if (error instanceof RequestError && (error.status === 403 || error.status === 404)) return null;
        throw error;
      }
    },

    async completeCheckRun(checkRunId, { conclusion, title, summary, detailsUrl }) {
      await kit.rest.checks.update({
        owner,
        repo,
        check_run_id: checkRunId,
        status: "completed",
        conclusion,
        details_url: detailsUrl,
        output: { title, summary },
      });
    },
  };
}

export async function repoPort(installationId: number, owner: string, repo: string): Promise<GitHubPort> {
  const octokit = await githubApp().getInstallationOctokit(installationId);
  return createGitHubPort(octokit, owner, repo);
}
