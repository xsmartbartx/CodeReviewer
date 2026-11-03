import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as orgPlanRoute } from "@/app/api/internal/org-plan/route";
import type { Db } from "@/db";
import { accounts, nexoraLinkRequests, nexoraOrgPlans, repositories, reviews, users, type User } from "@/db/schema";
import { effectivePlan, PLANS } from "@/lib/billing/plans";
import { applySubscription, handleStripeEvent, isOwnSubscription } from "@/lib/billing/stripe";
import { resetEnvForTesting } from "@/lib/env";
import { handleWebhook } from "@/lib/github/handlers";
import { canLink, completeLink, isFreshSignIn, parseGrant, startLink, unlink } from "@/lib/nexora/link";
import { accountPlan, applyOrgPlan, linkedOrgPlan } from "@/lib/nexora/org-plans";
import { sign, verify } from "@/lib/nexora/signature";
import { processReviewJob } from "@/worker/process";
import { createTestDb } from "./helpers/db";
import { FakeGitHub, FakeQueue } from "./helpers/fakes";
import { FakeModel } from "./helpers/model";

const SECRET = "nexora-shared-secret";
const ORG = "org_2abcdefghijkl";
const NOW = 1_800_000_000;

let database: Db;

function enableNexora() {
  process.env.NEXORA_SYNC_SECRET = SECRET;
  process.env.NEXORA_CONSOLE_URL = "https://console.example.test/";
  resetEnvForTesting();
}

function disableNexora() {
  delete process.env.NEXORA_SYNC_SECRET;
  delete process.env.NEXORA_CONSOLE_URL;
  resetEnvForTesting();
}

beforeEach(async () => {
  database = await createTestDb();
  enableNexora();
});
afterEach(disableNexora);

async function insertAccount(values: Partial<typeof accounts.$inferInsert> = {}) {
  const [row] = await database
    .insert(accounts)
    .values({ githubAccountId: 10, login: "acme", installationId: 555, ...values })
    .returning();
  return row!;
}

async function insertUser(githubId: number, login = `user${githubId}`): Promise<User> {
  const [row] = await database.insert(users).values({ githubId, login }).returning();
  return row!;
}

describe("signatures", () => {
  it("is HMAC-SHA256 over '<prefix><timestamp>.<body>' in hex, as Core signs it", () => {
    const expected = createHmac("sha256", "k").update('1700000000.{"a":1}').digest("hex");
    expect(sign("k", 1_700_000_000, '{"a":1}')).toBe(expected);
    expect(sign("k", 1, "b", "link.")).toBe(createHmac("sha256", "k").update("link.1.b").digest("hex"));
  });

  it("accepts only the right secret, body and prefix inside the window", () => {
    const signature = sign(SECRET, NOW, "body");
    const base = { secret: SECRET, timestamp: String(NOW), signature, body: "body", windowSeconds: 300 };
    expect(verify({ ...base, now: NOW * 1000 })).toBe(true);
    expect(verify({ ...base, now: (NOW + 299) * 1000 })).toBe(true);
    expect(verify({ ...base, now: (NOW + 301) * 1000 })).toBe(false);
    expect(verify({ ...base, now: (NOW - 301) * 1000 })).toBe(false);
    expect(verify({ ...base, secret: "other", now: NOW * 1000 })).toBe(false);
    expect(verify({ ...base, body: "body ", now: NOW * 1000 })).toBe(false);
    // A plan update can never be replayed as a link grant, or the other way round.
    expect(verify({ ...base, prefix: "link.", now: NOW * 1000 })).toBe(false);
    expect(verify({ ...base, signature: "zz", now: NOW * 1000 })).toBe(false);
    expect(verify({ ...base, timestamp: null, now: NOW * 1000 })).toBe(false);
  });
});

describe("POST /api/internal/org-plan", () => {
  function send(payload: unknown, options: { secret?: string; timestamp?: number; raw?: string } = {}) {
    const body = options.raw ?? JSON.stringify(payload);
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
    return orgPlanRoute(
      new Request("http://localhost/api/internal/org-plan", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-nexora-timestamp": String(timestamp),
          "x-nexora-signature": sign(options.secret ?? SECRET, timestamp, body),
        },
      }),
    );
  }

  const stored = async () => (await database.select().from(nexoraOrgPlans).where(eq(nexoraOrgPlans.orgId, ORG)))[0];

  it("answers 404 until the shared secret is set", async () => {
    disableNexora();
    expect((await send({ clerk_org_id: ORG, plan_id: "pro", as_of: NOW })).status).toBe(404);
  });

  it("rejects a wrong signature and a stale timestamp the same way", async () => {
    const payload = { clerk_org_id: ORG, plan_id: "pro", as_of: NOW };
    const wrong = await send(payload, { secret: "nope" });
    const stale = await send(payload, { timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect(wrong.status).toBe(401);
    expect(stale.status).toBe(401);
    expect(await wrong.json()).toEqual(await stale.json());
    expect(await stored()).toBeUndefined();
  });

  it("rejects an oversized body", async () => {
    expect((await send(null, { raw: "x".repeat(2000) })).status).toBe(401);
  });

  it.each([
    { clerk_org_id: "acme", plan_id: "pro", as_of: NOW },
    { clerk_org_id: ORG, plan_id: "enterprise", as_of: NOW },
    { clerk_org_id: ORG, plan_id: "pro", as_of: "yesterday" },
    { clerk_org_id: ORG, plan_id: "pro" },
    null,
  ])("rejects an invalid payload %j", async (payload) => {
    expect((await send(payload)).status).toBe(400);
  });

  it("stores the plan before any account is linked, and is idempotent", async () => {
    const first = await send({ clerk_org_id: ORG, plan_id: "team", as_of: NOW });
    expect(await first.json()).toEqual({ status: "applied" });
    const again = await send({ clerk_org_id: ORG, plan_id: "team", as_of: NOW });
    expect(await again.json()).toEqual({ status: "applied" });
    expect(await stored()).toMatchObject({ plan: "team", asOf: new Date(NOW * 1000) });
  });

  it("ignores an update older than the stored one (Stripe does not guarantee order)", async () => {
    await send({ clerk_org_id: ORG, plan_id: "free", as_of: NOW + 10 });
    const late = await send({ clerk_org_id: ORG, plan_id: "pro", as_of: NOW });
    expect(await late.json()).toEqual({ status: "stale" });
    expect((await stored())?.plan).toBe("free");
  });
});

describe("effective plan", () => {
  const own = (plan: "free" | "pro" | "team", status: string | null = "active") => ({
    plan,
    subscriptionStatus: status,
  });

  it("is the higher of the account's own plan and its organisation's", () => {
    expect(effectivePlan(own("free", null), true, "pro").id).toBe("pro");
    expect(effectivePlan(own("team"), true, "pro").id).toBe("team");
    expect(effectivePlan(own("pro"), true, "team").id).toBe("team");
    expect(effectivePlan(own("pro", "canceled"), true, "free").id).toBe("free");
    expect(effectivePlan(own("pro"), true, null).id).toBe("pro");
    expect(effectivePlan(own("free", null), false, "free")).toMatchObject({ name: "Self-hosted" });
  });

  it("uses a linked organisation's plan only while the integration is on", async () => {
    const account = await insertAccount({ nexoraOrgId: ORG });
    await applyOrgPlan(ORG, "team", new Date(NOW * 1000));
    expect(await linkedOrgPlan(account)).toBe("team");
    expect((await accountPlan(account, true)).id).toBe("team");

    disableNexora();
    expect(await linkedOrgPlan(account)).toBeNull();
    expect((await accountPlan(account, true)).id).toBe("free");
  });

  it("raises the worker's review quota for a linked account", async () => {
    const account = await insertAccount({ nexoraOrgId: ORG });
    const [repo] = await database
      .insert(repositories)
      .values({ accountId: account.id, githubRepoId: 100, fullName: "acme/api" })
      .returning();
    await database.insert(reviews).values(
      Array.from({ length: PLANS.free.reviewsPerMonth }, (_, i) => ({
        accountId: account.id,
        repositoryId: repo!.id,
        prNumber: 100 + i,
        headSha: `sha-${i}`,
        status: "completed" as const,
      })),
    );
    const github = new FakeGitHub();
    github.files = [
      { path: "src/a.ts", status: "modified", additions: 1, deletions: 0, patch: "@@ -1 +1,2 @@\n a\n+b" },
    ];
    const deps = {
      portFor: async () => github,
      model: () => new FakeModel(() => ({ summary: "Fine.", files: [], findings: [] })),
      billing: true,
    };
    const job = {
      installationId: 555,
      repoGithubId: 100,
      owner: "acme",
      repo: "api",
      prNumber: 7,
      trigger: "auto" as const,
      full: false,
    };
    expect((await processReviewJob(job, deps)).status).toBe("quota");
    await applyOrgPlan(ORG, "pro", new Date(NOW * 1000));
    expect((await processReviewJob(job, deps)).status).toBe("completed");
  });
});

describe("installer", () => {
  it("is recorded from the sender of installation.created, and kept on later events", async () => {
    const deps = { queue: new FakeQueue(), portFor: async () => new FakeGitHub() };
    const owner = { id: 10, login: "acme", type: "Organization" };
    const created = { action: "created", installation: { id: 555, account: owner }, sender: { id: 42 } };
    await handleWebhook("installation", created, deps);
    expect((await database.select().from(accounts))[0]?.installerGithubId).toBe(42);

    await handleWebhook("installation", { ...created, action: "unsuspend", sender: { id: 99 } }, deps);
    expect((await database.select().from(accounts))[0]?.installerGithubId).toBe(42);
  });
});

describe("linking an account to an organisation", () => {
  function grantFor(fields: Record<string, unknown>, options: { secret?: string; timestamp?: number } = {}) {
    const body = JSON.stringify({ org_id: ORG, org_name: "Acme Inc", plan_id: "pro", ...fields });
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
    return {
      grant: Buffer.from(body).toString("base64url"),
      timestamp: String(timestamp),
      signature: sign(options.secret ?? SECRET, timestamp, body, "link."),
    };
  }

  it("is allowed for the account itself or whoever installed the app on it", () => {
    const account = { githubAccountId: 10, installerGithubId: 42 };
    expect(canLink({ githubId: 42 }, account)).toBe(true);
    expect(canLink({ githubId: 10 }, account)).toBe(true);
    expect(canLink({ githubId: 7 }, account)).toBe(false);
    expect(canLink({ githubId: 7 }, { githubAccountId: 10, installerGithubId: null })).toBe(false);
  });

  it("needs a GitHub sign-in from the last ten minutes", () => {
    const now = new Date();
    expect(isFreshSignIn(new Date(now.getTime() - 9 * 60 * 1000), now)).toBe(true);
    expect(isFreshSignIn(new Date(now.getTime() - 11 * 60 * 1000), now)).toBe(false);
  });

  it("links with a grant Console signed for the request this browser started", async () => {
    const installer = await insertUser(42, "installer");
    const account = await insertAccount({ installerGithubId: 42 });
    const { nonce, consoleUrl } = await startLink(installer, account);
    const url = new URL(consoleUrl);
    expect(url.origin + url.pathname).toBe("https://console.example.test/link/codereviewer");
    expect(Object.fromEntries(url.searchParams)).toEqual({ account: account.id, login: "acme", nonce });
    // Only a hash of the nonce is stored.
    expect((await database.select().from(nexoraLinkRequests))[0]?.id).not.toBe(nonce);

    const grant = parseGrant(grantFor({ account_id: account.id, nonce }));
    expect(grant).not.toBeNull();
    const result = await completeLink(grant!, nonce, installer);
    expect(result.ok).toBe(true);
    const [linked] = await database.select().from(accounts);
    expect(linked).toMatchObject({ nexoraOrgId: ORG, nexoraOrgName: "Acme Inc" });
    // The grant's plan fills in an organisation Core has not pushed yet; any push replaces it.
    expect(await linkedOrgPlan(linked!)).toBe("pro");
    await applyOrgPlan(ORG, "free", new Date(1000));
    expect(await linkedOrgPlan(linked!)).toBe("free");
    // Single use.
    expect((await completeLink(grant!, nonce, installer)).ok).toBe(false);
  });

  it("does not let a grant replace a plan Core already pushed", async () => {
    const installer = await insertUser(42);
    const account = await insertAccount({ installerGithubId: 42 });
    await applyOrgPlan(ORG, "team", new Date(NOW * 1000));
    const { nonce } = await startLink(installer, account);
    await completeLink(parseGrant(grantFor({ account_id: account.id, nonce }))!, nonce, installer);
    expect(await linkedOrgPlan({ nexoraOrgId: ORG })).toBe("team");
  });

  it.each([
    ["a forged signature", { secret: "attacker" }],
    ["an expired grant", { timestamp: Math.floor(Date.now() / 1000) - 3600 }],
  ])("rejects %s", async (_label, options) => {
    const account = await insertAccount();
    expect(parseGrant(grantFor({ account_id: account.id, nonce: "n".repeat(43) }, options))).toBeNull();
  });

  it("rejects a plan-update signature used as a grant", async () => {
    const account = await insertAccount();
    const body = JSON.stringify({
      org_id: ORG,
      org_name: "x",
      plan_id: "pro",
      account_id: account.id,
      nonce: "n".repeat(43),
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const input = { grant: Buffer.from(body).toString("base64url"), timestamp: String(timestamp) };
    expect(parseGrant({ ...input, signature: sign(SECRET, timestamp, body) })).toBeNull();
  });

  it("refuses a grant delivered to another browser or completed by another user", async () => {
    const installer = await insertUser(42);
    const other = await insertUser(43);
    const account = await insertAccount({ installerGithubId: 42 });

    const first = await startLink(installer, account);
    const grant1 = parseGrant(grantFor({ account_id: account.id, nonce: first.nonce }))!;
    expect(await completeLink(grant1, undefined, installer)).toEqual({ ok: false, reason: "browser" });
    expect(await completeLink(grant1, "x".repeat(43), installer)).toEqual({ ok: false, reason: "browser" });

    const second = await startLink(installer, account);
    const grant2 = parseGrant(grantFor({ account_id: account.id, nonce: second.nonce }))!;
    expect(await completeLink(grant2, second.nonce, other)).toEqual({ ok: false, reason: "mismatch" });
    expect((await database.select().from(accounts))[0]?.nexoraOrgId).toBeNull();
  });

  it("refuses a grant made for another account", async () => {
    const installer = await insertUser(42);
    const account = await insertAccount({ installerGithubId: 42 });
    const [otherAccount] = await database
      .insert(accounts)
      .values({ githubAccountId: 11, login: "other", installerGithubId: 42 })
      .returning();
    const { nonce } = await startLink(installer, account);
    const grant = parseGrant(grantFor({ account_id: otherAccount!.id, nonce }))!;
    expect(await completeLink(grant, nonce, installer)).toEqual({ ok: false, reason: "mismatch" });
  });

  it("refuses an expired request", async () => {
    const installer = await insertUser(42);
    const account = await insertAccount({ installerGithubId: 42 });
    const { nonce } = await startLink(installer, account, new Date(Date.now() - 11 * 60 * 1000));
    const grant = parseGrant(grantFor({ account_id: account.id, nonce }))!;
    expect(await completeLink(grant, nonce, installer)).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses a user who lost the right to link before completing", async () => {
    const installer = await insertUser(42);
    const account = await insertAccount({ installerGithubId: 42 });
    const { nonce } = await startLink(installer, account);
    await database.update(accounts).set({ installerGithubId: 99 });
    const grant = parseGrant(grantFor({ account_id: account.id, nonce }))!;
    expect(await completeLink(grant, nonce, installer)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("unlinks only for someone allowed to link", async () => {
    const installer = await insertUser(42);
    const stranger = await insertUser(7);
    const account = await insertAccount({ installerGithubId: 42, nexoraOrgId: ORG, nexoraOrgName: "Acme" });
    expect(await unlink(stranger, account)).toBe(false);
    expect(await unlink(installer, account)).toBe(true);
    expect((await database.select().from(accounts))[0]).toMatchObject({ nexoraOrgId: null, nexoraOrgName: null });
  });
});

describe("the shared Stripe account", () => {
  const STRIPE_ENV = {
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test_123",
    STRIPE_PRICE_PRO: "price_pro",
    STRIPE_PRICE_TEAM: "price_team",
  };
  beforeAll(() => Object.assign(process.env, STRIPE_ENV));
  afterAll(() => {
    for (const key of Object.keys(STRIPE_ENV)) delete process.env[key];
    resetEnvForTesting();
  });

  const subscription = (metadata: Record<string, string>, price = "price_pro", customer = "cus_1") =>
    ({
      id: "sub_core",
      object: "subscription",
      customer,
      status: "active",
      metadata,
      items: { data: [{ price: { id: price }, current_period_end: NOW }] },
    }) as unknown as Stripe.Subscription;

  it("leaves Core's subscriptions (orgId metadata) to Core, even on our prices and customers", async () => {
    const account = await insertAccount({ stripeCustomerId: "cus_1" });
    const core = subscription({ orgId: ORG, product: "codereviewer" });
    expect(isOwnSubscription(core)).toBe(false);
    await applySubscription(core);
    expect((await database.select().from(accounts).where(eq(accounts.id, account.id)))[0]?.plan).toBe("free");
  });

  it("ignores another product's subscription on a customer it knows", async () => {
    await insertAccount({ stripeCustomerId: "cus_1" });
    expect(isOwnSubscription(subscription({}, "price_vigilo"))).toBe(false);
    await applySubscription(subscription({}, "price_vigilo"));
    expect((await database.select().from(accounts))[0]).toMatchObject({ plan: "free", stripeSubscriptionId: null });
  });

  it("still applies its own subscriptions", () => {
    expect(isOwnSubscription(subscription({ accountId: "a" }))).toBe(true);
    expect(isOwnSubscription(subscription({}, "price_team"))).toBe(true);
  });

  it("does not fetch subscriptions for checkouts it did not create", async () => {
    resetEnvForTesting();
    const event = {
      id: "evt_core_checkout",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", subscription: "sub_core", client_reference_id: null } },
    } as unknown as Stripe.Event;
    // A Stripe API call would fail with the fake key; finishing quietly shows none was made.
    await expect(handleStripeEvent(event)).resolves.toBeUndefined();
  });
});
