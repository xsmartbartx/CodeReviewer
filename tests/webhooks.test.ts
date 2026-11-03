import { sign } from "@octokit/webhooks-methods";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/github/webhook/route";
import type { Db } from "@/db";
import { accounts, repositories } from "@/db/schema";
import { parseCommand } from "@/lib/github/commands";
import { handleWebhook, type WebhookDeps } from "@/lib/github/handlers";
import { setQueueForTesting } from "@/lib/queue";
import { createTestDb } from "./helpers/db";
import { FakeGitHub, FakeQueue } from "./helpers/fakes";

const owner = { id: 10, login: "acme", type: "Organization", avatar_url: "https://avatars/acme" };
const repo = { id: 100, name: "api", full_name: "acme/api", private: true, owner };

const installationCreated = {
  action: "created",
  installation: { id: 555, account: owner },
  repositories: [{ id: 100, full_name: "acme/api", private: true }],
};

let database: Db;
let fakeQueue: FakeQueue;
let fakeGitHub: FakeGitHub;
let deps: WebhookDeps;

beforeEach(async () => {
  database = await createTestDb();
  fakeQueue = new FakeQueue();
  fakeGitHub = new FakeGitHub();
  deps = { queue: fakeQueue, portFor: async () => fakeGitHub };
});

describe("parseCommand", () => {
  it.each([
    ["@codereviewer review", { kind: "review", full: false }],
    ["@codereviewer", { kind: "review", full: false }],
    ["Thanks! @CodeReviewer full review please", { kind: "unknown", text: "full review please" }],
    ["@codereviewer full review", { kind: "review", full: true }],
    ["@codereviewer[bot] help", { kind: "help" }],
    ["hey\n@codereviewer review\nthanks", { kind: "review", full: false }],
  ])("parses %j", (body, expected) => {
    expect(parseCommand(body, "codereviewer")).toEqual(expected);
  });

  it("ignores comments without a mention", () => {
    expect(parseCommand("please review", "codereviewer")).toBeNull();
    expect(parseCommand("email me at a@codereviewer.dev", "codereviewer")).toBeNull();
    expect(parseCommand("@codereviewerx review", "codereviewer")).toBeNull();
  });
});

describe("webhook route", () => {
  async function deliver(
    event: string,
    payload: object,
    delivery = crypto.randomUUID(),
    secret = "test-webhook-secret",
  ) {
    const body = JSON.stringify(payload);
    return POST(
      new Request("http://localhost/api/github/webhook", {
        method: "POST",
        body,
        headers: {
          "x-github-event": event,
          "x-github-delivery": delivery,
          "x-hub-signature-256": await sign(secret, body),
        },
      }),
    );
  }

  it("rejects a bad signature", async () => {
    const res = await deliver("installation", installationCreated, "d1", "wrong-secret");
    expect(res.status).toBe(401);
  });

  it("processes a delivery once", async () => {
    setQueueForTesting(fakeQueue);
    expect((await deliver("installation", installationCreated, "d2")).status).toBe(202);
    const dup = await deliver("installation", installationCreated, "d2");
    expect(await dup.json()).toEqual({ ok: true, duplicate: true });
    const rows = await database.select().from(accounts);
    expect(rows).toHaveLength(1);
    setQueueForTesting(undefined);
  });
});

describe("installation events", () => {
  it("creates the account and repositories", async () => {
    await handleWebhook("installation", installationCreated, deps);
    const [account] = await database.select().from(accounts);
    expect(account).toMatchObject({ login: "acme", installationId: 555, plan: "free" });
    const repos = await database.select().from(repositories);
    expect(repos.map((r) => r.fullName)).toEqual(["acme/api"]);
  });

  it("keeps history on uninstall and reattaches on reinstall", async () => {
    await handleWebhook("installation", installationCreated, deps);
    await handleWebhook("installation", { ...installationCreated, action: "deleted" }, deps);
    let [account] = await database.select().from(accounts);
    expect(account?.installationId).toBeNull();
    expect((await database.select().from(repositories))[0]?.active).toBe(false);

    await handleWebhook("installation", { ...installationCreated, installation: { id: 777, account: owner } }, deps);
    [account] = await database.select().from(accounts);
    expect(account?.installationId).toBe(777);
    expect((await database.select().from(repositories))[0]?.active).toBe(true);
  });

  it("tracks repositories added and removed", async () => {
    await handleWebhook("installation", installationCreated, deps);
    await handleWebhook(
      "installation_repositories",
      {
        action: "added",
        installation: { id: 555, account: owner },
        repositories_added: [{ id: 101, full_name: "acme/web", private: false }],
        repositories_removed: [{ id: 100, full_name: "acme/api", private: true }],
      },
      deps,
    );
    const repos = await database.select().from(repositories);
    expect(repos.find((r) => r.githubRepoId === 101)?.active).toBe(true);
    expect(repos.find((r) => r.githubRepoId === 100)?.active).toBe(false);
  });
});

describe("pull_request events", () => {
  const prEvent = (action: string) => ({ action, installation: { id: 555 }, number: 7, repository: repo });

  it("enqueues a review for opened and synchronize", async () => {
    await handleWebhook("installation", installationCreated, deps);
    await handleWebhook("pull_request", prEvent("opened"), deps);
    await handleWebhook("pull_request", prEvent("synchronize"), deps);
    await handleWebhook("pull_request", prEvent("closed"), deps);
    expect(fakeQueue.jobs).toHaveLength(2);
    expect(fakeQueue.jobs[0]).toEqual({
      installationId: 555,
      repoGithubId: 100,
      owner: "acme",
      repo: "api",
      prNumber: 7,
      trigger: "auto",
      full: false,
    });
  });

  it("skips disabled repositories and suspended installations", async () => {
    await handleWebhook("installation", installationCreated, deps);
    await database.update(repositories).set({ enabled: false });
    await handleWebhook("pull_request", prEvent("opened"), deps);
    expect(fakeQueue.jobs).toHaveLength(0);

    await database.update(repositories).set({ enabled: true });
    await handleWebhook("installation", { ...installationCreated, action: "suspend" }, deps);
    await handleWebhook("pull_request", prEvent("opened"), deps);
    expect(fakeQueue.jobs).toHaveLength(0);
  });

  it("creates missing rows when the installation webhook was missed", async () => {
    await handleWebhook("pull_request", prEvent("opened"), deps);
    expect(fakeQueue.jobs).toHaveLength(1);
    const [account] = await database.select().from(accounts).where(eq(accounts.installationId, 555));
    expect(account?.login).toBe("acme");
  });
});

describe("issue_comment commands", () => {
  const comment = (body: string, association = "MEMBER", login = "maintainer", type = "User") => ({
    action: "created",
    installation: { id: 555 },
    issue: { number: 7, pull_request: {}, user: { login: "octocat" } },
    comment: { id: 42, body, author_association: association, user: { login, type } },
    repository: repo,
  });

  beforeEach(async () => {
    await handleWebhook("installation", installationCreated, deps);
  });

  it("queues a full review and acknowledges the comment", async () => {
    await handleWebhook("issue_comment", comment("@codereviewer full review"), deps);
    expect(fakeQueue.jobs[0]).toMatchObject({ trigger: "command", full: true, prNumber: 7 });
    expect(fakeGitHub.reactions).toEqual([{ commentId: 42, content: "eyes" }]);
  });

  it("lets the PR author trigger a review", async () => {
    await handleWebhook("issue_comment", comment("@codereviewer review", "CONTRIBUTOR", "octocat"), deps);
    expect(fakeQueue.jobs).toHaveLength(1);
  });

  it("ignores untrusted users and bots", async () => {
    await handleWebhook("issue_comment", comment("@codereviewer review", "NONE", "stranger"), deps);
    await handleWebhook("issue_comment", comment("@codereviewer review", "MEMBER", "ci[bot]", "Bot"), deps);
    expect(fakeQueue.jobs).toHaveLength(0);
  });

  it("replies with help", async () => {
    await handleWebhook("issue_comment", comment("@codereviewer help"), deps);
    expect(fakeGitHub.issueComments[0]?.body).toContain("CodeReviewer commands");
    expect(fakeQueue.jobs).toHaveLength(0);
  });
});
