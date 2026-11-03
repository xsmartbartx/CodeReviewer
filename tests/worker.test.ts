import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { accounts, repositories, reviews, sessions, users, webhookDeliveries } from "@/db/schema";
import { effectivePlan, periodStart, PLANS } from "@/lib/billing/plans";
import type { ReviewJob } from "@/lib/queue";
import { runMaintenance } from "@/worker/maintenance";
import { processReviewJob, type ProcessDeps } from "@/worker/process";
import { createTestDb } from "./helpers/db";
import { FakeGitHub } from "./helpers/fakes";
import { FakeModel } from "./helpers/model";

const PATCH = "@@ -1,2 +1,3 @@\n const a = 1;\n+const b = a / 0;\n export { a };";

const job: ReviewJob = {
  installationId: 555,
  repoGithubId: 100,
  owner: "acme",
  repo: "api",
  prNumber: 7,
  trigger: "auto",
  full: false,
};

let database: Db;
let github: FakeGitHub;
let model: FakeModel;
let deps: ProcessDeps;
let accountId: string;
let repoId: string;

beforeEach(async () => {
  database = await createTestDb();
  const [account] = await database
    .insert(accounts)
    .values({ githubAccountId: 10, login: "acme", installationId: 555 })
    .returning();
  const [repo] = await database
    .insert(repositories)
    .values({ accountId: account!.id, githubRepoId: 100, fullName: "acme/api" })
    .returning();
  accountId = account!.id;
  repoId = repo!.id;

  github = new FakeGitHub();
  github.files = [{ path: "src/a.ts", status: "modified", additions: 1, deletions: 0, patch: PATCH }];
  model = new FakeModel(() => ({
    summary: "Adds b.",
    files: [{ path: "src/a.ts", summary: "Adds b." }],
    findings: [
      {
        path: "src/a.ts",
        line: 2,
        start_line: null,
        severity: "major",
        category: "bug",
        title: "Division by zero",
        body: "Always Infinity.",
        suggestion: null,
      },
    ],
  }));
  deps = { portFor: async () => github, model: () => model, billing: true };
});

describe("processReviewJob", () => {
  it("records a completed review", async () => {
    const result = await processReviewJob(job, deps);
    expect(result.status).toBe("completed");
    const [row] = await database.select().from(reviews).where(eq(reviews.id, result.reviewId!));
    expect(row).toMatchObject({
      status: "completed",
      headSha: "head-sha-2",
      prTitle: "Add login rate limiting",
      filesReviewed: 1,
      commentsPosted: 1,
      findingCounts: { critical: 0, major: 1, minor: 0, nit: 0 },
      model: "fake-model",
      inputTokens: 1000,
      outputTokens: 200,
      githubReviewId: 1001,
    });
  });

  it("reviews incrementally from the last completed review", async () => {
    await processReviewJob(job, deps);
    github.pr.headSha = "head-sha-3";
    github.compare["head-sha-2...head-sha-3"] = [
      { path: "src/c.ts", status: "added", additions: 1, deletions: 0, patch: "@@ -0,0 +1 @@\n+export const c = 3;" },
    ];
    await processReviewJob(job, deps);
    const rows = await database.select().from(reviews).orderBy(reviews.createdAt);
    expect(rows[1]).toMatchObject({ status: "completed", baseSha: "head-sha-2", headSha: "head-sha-3" });
  });

  it("ignores disabled repositories", async () => {
    await database.update(repositories).set({ enabled: false });
    expect((await processReviewJob(job, deps)).status).toBe("ignored");
    expect(github.reviews).toHaveLength(0);
  });

  it("stops at the plan quota and tells the PR once", async () => {
    const used = Array.from({ length: PLANS.free.reviewsPerMonth }, (_, i) => ({
      accountId,
      repositoryId: repoId,
      prNumber: 100 + i,
      headSha: `sha-${i}`,
      status: "completed" as const,
    }));
    await database.insert(reviews).values(used);

    expect((await processReviewJob(job, deps)).status).toBe("quota");
    expect((await processReviewJob(job, deps)).status).toBe("quota");
    expect(github.reviews).toHaveLength(0);
    expect(github.issueComments).toHaveLength(1);
    expect(github.issueComments[0]?.body).toContain("/dashboard/acme/billing");
  });

  it("does not limit self-hosted installs", async () => {
    const used = Array.from({ length: 30 }, (_, i) => ({
      accountId,
      repositoryId: repoId,
      prNumber: 100 + i,
      headSha: `sha-${i}`,
      status: "completed" as const,
    }));
    await database.insert(reviews).values(used);
    expect((await processReviewJob(job, { ...deps, billing: false })).status).toBe("completed");
  });

  it("records skipped reviews without counting them", async () => {
    github.pr.draft = true;
    const result = await processReviewJob(job, deps);
    expect(result.status).toBe("skipped");
    const [row] = await database.select().from(reviews);
    expect(row).toMatchObject({ status: "skipped", skipReason: "Draft pull request." });
  });

  it("reuses the row when the queue retries the same job", async () => {
    model = new FakeModel((_, call) =>
      call === 1
        ? new Error("overloaded")
        : { summary: "Adds b.", files: [{ path: "src/a.ts", summary: "Adds b." }], findings: [] },
    );
    await expect(processReviewJob(job, deps, "job-1")).rejects.toThrow("overloaded");
    await processReviewJob(job, deps, "job-1");
    const rows = await database.select().from(reviews);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "completed", error: null, jobId: "job-1" });
  });

  it("marks failures and rethrows for retry", async () => {
    model = new FakeModel(() => new Error("rate limited"));
    await expect(processReviewJob(job, deps)).rejects.toThrow("rate limited");
    const [row] = await database.select().from(reviews);
    expect(row).toMatchObject({ status: "failed", error: "rate limited" });
  });
});

describe("plans", () => {
  it("falls back to free when a subscription lapses", () => {
    expect(effectivePlan({ plan: "pro", subscriptionStatus: "active" }, true).id).toBe("pro");
    expect(effectivePlan({ plan: "pro", subscriptionStatus: "canceled" }, true).id).toBe("free");
    expect(effectivePlan({ plan: "free", subscriptionStatus: null }, false).reviewsPerMonth).toBe(Infinity);
  });

  it("resets on the first of the month in UTC", () => {
    expect(periodStart(new Date("2026-11-30T23:59:00Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("maintenance", () => {
  it("deletes expired sessions and old deliveries", async () => {
    const [user] = await database.insert(users).values({ githubId: 1, login: "octocat" }).returning();
    await database.insert(sessions).values([
      { id: "old", userId: user!.id, expiresAt: new Date("2020-01-01") },
      { id: "new", userId: user!.id, expiresAt: new Date("2099-01-01") },
    ]);
    await database.insert(webhookDeliveries).values([
      { id: "d-old", event: "ping", receivedAt: new Date("2020-01-01") },
      { id: "d-new", event: "ping" },
    ]);
    await runMaintenance();
    expect((await database.select().from(sessions)).map((s) => s.id)).toEqual(["new"]);
    expect((await database.select().from(webhookDeliveries)).map((d) => d.id)).toEqual(["d-new"]);
  });
});
