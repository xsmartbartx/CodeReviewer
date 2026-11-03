import type { JobQueue, ReviewJob } from "@/lib/queue";
import type { ChangedFile, GitHubPort, PullRequestInfo, ReviewComment, ReviewEvent } from "@/lib/github/port";

export class FakeQueue implements JobQueue {
  jobs: ReviewJob[] = [];
  async enqueueReview(job: ReviewJob) {
    this.jobs.push(job);
    return `job-${this.jobs.length}`;
  }
}

export type PostedReview = {
  prNumber: number;
  commitId: string;
  body: string;
  event: ReviewEvent;
  comments: ReviewComment[];
};

export class FakeGitHub implements GitHubPort {
  pr: PullRequestInfo;
  files: ChangedFile[] = [];
  compare: Record<string, ChangedFile[] | null> = {};
  contents: Record<string, string> = {};
  reviews: PostedReview[] = [];
  issueComments: { prNumber: number; body: string }[] = [];
  reactions: { commentId: number; content: string }[] = [];
  checkRuns: { id: number; headSha: string; conclusion?: string; title: string; summary: string }[] = [];
  /** When set, createReview throws this once for reviews that carry inline comments. */
  rejectInlineComments = false;

  constructor(pr: Partial<PullRequestInfo> = {}) {
    this.pr = {
      number: 7,
      title: "Add login rate limiting",
      body: "Limits login attempts per IP.",
      draft: false,
      state: "open",
      headSha: "head-sha-2",
      headRef: "feature/rate-limit",
      headRepoFullName: "acme/api",
      baseSha: "base-sha",
      baseRef: "main",
      baseRepoFullName: "acme/api",
      author: "octocat",
      authorIsBot: false,
      htmlUrl: "https://github.com/acme/api/pull/7",
      ...pr,
    };
  }

  async getPullRequest() {
    return this.pr;
  }
  async listPullRequestFiles() {
    return this.files;
  }
  async compareCommits(base: string, head: string) {
    return this.compare[`${base}...${head}`] ?? null;
  }
  async getFileContent(path: string, ref: string) {
    return this.contents[`${ref}:${path}`] ?? null;
  }
  async createReview(prNumber: number, review: Omit<PostedReview, "prNumber">) {
    if (this.rejectInlineComments && review.comments.length > 0) {
      this.rejectInlineComments = false;
      throw Object.assign(new Error("Unprocessable Entity: line must be part of the diff"), { status: 422 });
    }
    this.reviews.push({ prNumber, ...review });
    return { id: 1000 + this.reviews.length };
  }
  async createIssueComment(prNumber: number, body: string) {
    this.issueComments.push({ prNumber, body });
  }
  async addCommentReaction(commentId: number, content: string) {
    this.reactions.push({ commentId, content });
  }
  async createCheckRun(input: { headSha: string; title: string; summary: string }) {
    const id = this.checkRuns.length + 1;
    this.checkRuns.push({ id, ...input });
    return id;
  }
  async completeCheckRun(id: number, input: { conclusion: string; title: string; summary: string }) {
    const run = this.checkRuns.find((r) => r.id === id);
    if (run) Object.assign(run, input);
  }
}
