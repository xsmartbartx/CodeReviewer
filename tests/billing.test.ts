import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as stripeWebhook } from "@/app/api/stripe/webhook/route";
import type { Db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { createSession, hashToken, safeEqual, safeRedirectPath, userForToken } from "@/lib/auth/session";
import { applySubscription } from "@/lib/billing/stripe";
import { resetEnvForTesting } from "@/lib/env";
import { createTestDb } from "./helpers/db";

const STRIPE_ENV = {
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_test_123",
  STRIPE_PRICE_PRO: "price_pro",
  STRIPE_PRICE_TEAM: "price_team",
};

beforeAll(() => {
  Object.assign(process.env, STRIPE_ENV);
  resetEnvForTesting();
});
afterAll(() => {
  for (const key of Object.keys(STRIPE_ENV)) delete process.env[key];
  resetEnvForTesting();
});

let database: Db;
let accountId: string;

beforeEach(async () => {
  database = await createTestDb();
  const [account] = await database
    .insert(accounts)
    .values({ githubAccountId: 10, login: "acme", installationId: 555, stripeCustomerId: "cus_1" })
    .returning();
  accountId = account!.id;
});

function subscription(
  overrides: Partial<{ id: string; status: string; price: string; accountId: string | null }> = {},
) {
  const { id = "sub_1", status = "active", price = "price_pro", accountId: meta = accountId } = overrides;
  return {
    id,
    object: "subscription",
    customer: "cus_1",
    status,
    metadata: meta ? { accountId: meta } : {},
    items: { data: [{ price: { id: price }, current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

async function account() {
  const [row] = await database.select().from(accounts).where(eq(accounts.id, accountId));
  return row!;
}

describe("applySubscription", () => {
  it("activates the plan for the subscribed price", async () => {
    await applySubscription(subscription({ price: "price_team" }));
    expect(await account()).toMatchObject({
      plan: "team",
      subscriptionStatus: "active",
      stripeSubscriptionId: "sub_1",
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
    });
  });

  it("finds the account by customer when metadata is missing", async () => {
    await applySubscription(subscription({ accountId: null }));
    expect((await account()).plan).toBe("pro");
  });

  it("downgrades when the subscription ends", async () => {
    await applySubscription(subscription());
    await applySubscription(subscription({ status: "canceled" }));
    expect(await account()).toMatchObject({ plan: "free", stripeSubscriptionId: null, subscriptionStatus: "canceled" });
  });

  it("ignores an old subscription ending after a new one started", async () => {
    await applySubscription(subscription({ id: "sub_new", price: "price_team" }));
    await applySubscription(subscription({ id: "sub_old", status: "canceled" }));
    expect(await account()).toMatchObject({ plan: "team", stripeSubscriptionId: "sub_new" });
  });
});

describe("stripe webhook route", () => {
  const stripe = new Stripe("sk_test_123");

  async function send(event: object, secret = STRIPE_ENV.STRIPE_WEBHOOK_SECRET) {
    const payload = JSON.stringify(event);
    const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
    return stripeWebhook(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": header },
      }),
    );
  }

  const event = (id: string, status = "active") => ({
    id,
    object: "event",
    type: "customer.subscription.updated",
    data: { object: subscription({ status }) },
  });

  it("rejects invalid signatures", async () => {
    expect((await send(event("evt_1"), "whsec_wrong")).status).toBe(400);
    expect((await account()).plan).toBe("free");
  });

  it("applies an event once", async () => {
    expect((await send(event("evt_2"))).status).toBe(200);
    expect((await account()).plan).toBe("pro");
    await database.update(accounts).set({ plan: "free" });
    expect((await send(event("evt_2", "canceled"))).status).toBe(200);
    expect((await account()).plan).toBe("free");
  });
});

describe("sessions", () => {
  it("stores only a hash and resolves the user", async () => {
    const [user] = await database.insert(users).values({ githubId: 1, login: "octocat" }).returning();
    const { token } = await createSession(user!.id);
    const [row] = await database.select().from(sessions);
    expect(row?.id).toBe(hashToken(token));
    expect(row?.id).not.toBe(token);
    expect((await userForToken(token))?.login).toBe("octocat");
    expect(await userForToken("nope")).toBeNull();
    expect(await userForToken(undefined)).toBeNull();
  });

  it("rejects expired sessions", async () => {
    const [user] = await database.insert(users).values({ githubId: 2, login: "old" }).returning();
    await database
      .insert(sessions)
      .values({ id: hashToken("t"), userId: user!.id, expiresAt: new Date(Date.now() - 1000) });
    expect(await userForToken("t")).toBeNull();
  });

  it("only allows relative redirects", () => {
    expect(safeRedirectPath("/dashboard/acme")).toBe("/dashboard/acme");
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });

  it("compares secrets in constant time", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
