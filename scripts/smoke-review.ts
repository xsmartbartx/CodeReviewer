// Runs one real review against Claude with an in-memory pull request. Costs a few cents.
// Usage: ANTHROPIC_API_KEY=... npm run smoke:review
import type { ChangedFile, GitHubPort, ReviewComment } from "../src/lib/github/port";
import { runReview } from "../src/lib/review/engine";
import { ClaudeReviewModel } from "../src/lib/review/model";

const patch = `@@ -1,12 +1,20 @@
 import { db } from "./db";
+import { createHash } from "node:crypto";
 
 export async function login(email: string, password: string) {
-  const user = await db.users.findOne({ email });
-  if (!user) throw new Error("Invalid credentials");
-  return verify(user, password);
+  const user = await db.users.findOne({ email: email.trim() });
+  const hash = createHash("md5").update(password).digest("hex");
+  if (user.passwordHash == hash) {
+    return { token: user.id + ":" + Date.now() };
+  }
+  return null;
 }
 
 export async function listUsers(page: number) {
-  return db.users.find().limit(50).skip(page * 50);
+  const query = "SELECT * FROM users LIMIT 50 OFFSET " + page * 50;
+  return db.raw(query);
 }`;

const files: ChangedFile[] = [{ path: "src/auth.ts", status: "modified", additions: 10, deletions: 3, patch }];
let posted: { body: string; comments: ReviewComment[]; event: string } | undefined;

const github: GitHubPort = {
  async getPullRequest() {
    return {
      number: 1,
      title: "Simplify login and user listing",
      body: "Cleans up the auth module.",
      draft: false,
      state: "open",
      headSha: "abc1234def",
      headRef: "cleanup-auth",
      headRepoFullName: "demo/app",
      baseSha: "000base000",
      baseRef: "main",
      baseRepoFullName: "demo/app",
      author: "demo",
      authorIsBot: false,
      htmlUrl: "https://github.com/demo/app/pull/1",
    };
  },
  listPullRequestFiles: async () => files,
  compareCommits: async () => null,
  getFileContent: async () => null,
  async createReview(_n, review) {
    posted = review;
    return { id: 1 };
  },
  createIssueComment: async () => undefined,
  addCommentReaction: async () => undefined,
  createCheckRun: async () => null,
  completeCheckRun: async () => undefined,
};

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY to run the smoke test.");
  process.exit(1);
}

const model = new ClaudeReviewModel({
  apiKey,
  model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  effort: (process.env.ANTHROPIC_EFFORT as "medium") || "medium",
});
const started = Date.now();
const outcome = await runReview(
  { prNumber: 1, trigger: "command", full: true, lastReviewedSha: null },
  { github, model, slug: "codereviewer" },
);

console.log(`\nOutcome: ${outcome.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
if (outcome.status === "completed") {
  console.log(`Tokens: ${outcome.usage.inputTokens} in / ${outcome.usage.outputTokens} out`);
  console.log(`\n--- Review body (${posted?.event}) ---\n${posted?.body}`);
  for (const c of posted?.comments ?? [])
    console.log(`\n--- ${c.path}:${c.startLine ? `${c.startLine}-` : ""}${c.line} ---\n${c.body}`);
}
