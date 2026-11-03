/**
 * The slice of the GitHub API the review engine needs. Keeping it narrow lets
 * the engine run against an in-memory fake in tests.
 */

export type PullRequestInfo = {
  number: number;
  title: string;
  body: string;
  draft: boolean;
  state: "open" | "closed";
  headSha: string;
  headRef: string;
  headRepoFullName: string | null;
  baseSha: string;
  baseRef: string;
  baseRepoFullName: string;
  author: string;
  authorIsBot: boolean;
  htmlUrl: string;
};

export type FileStatus = "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";

export type ChangedFile = {
  path: string;
  previousPath?: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  /** Unified diff for the file; GitHub omits it for binary and very large files. */
  patch?: string;
};

export type ReviewComment = {
  path: string;
  line: number;
  side: "RIGHT";
  startLine?: number;
  body: string;
};

export type ReviewEvent = "COMMENT" | "REQUEST_CHANGES";

export type CheckConclusion = "success" | "neutral" | "failure" | "skipped";

export interface GitHubPort {
  getPullRequest(prNumber: number): Promise<PullRequestInfo>;
  listPullRequestFiles(prNumber: number): Promise<ChangedFile[]>;
  /** Files changed between two commits, or null when `base` is not an ancestor of `head` (force push). */
  compareCommits(base: string, head: string): Promise<ChangedFile[] | null>;
  getFileContent(path: string, ref: string): Promise<string | null>;
  createReview(
    prNumber: number,
    review: { commitId: string; body: string; event: ReviewEvent; comments: ReviewComment[] },
  ): Promise<{ id: number }>;
  createIssueComment(prNumber: number, body: string): Promise<void>;
  addCommentReaction(commentId: number, content: "eyes" | "+1" | "confused"): Promise<void>;
  createCheckRun(input: { headSha: string; title: string; summary: string }): Promise<number | null>;
  completeCheckRun(
    checkRunId: number,
    input: { conclusion: CheckConclusion; title: string; summary: string; detailsUrl?: string },
  ): Promise<void>;
}
