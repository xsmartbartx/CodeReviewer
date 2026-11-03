import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { accounts, stripeEvents, type Account, type Plan } from "@/db/schema";
import { env } from "@/lib/env";

let client: Stripe | undefined;

export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  client ??= new Stripe(key, { appInfo: { name: "CodeReviewer" } });
  return client;
}

export type PaidPlan = Exclude<Plan, "free">;

export function priceForPlan(plan: PaidPlan): string {
  const price = plan === "pro" ? env().STRIPE_PRICE_PRO : env().STRIPE_PRICE_TEAM;
  if (!price) throw new Error(`No Stripe price configured for ${plan}.`);
  return price;
}

export function planForPrice(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === env().STRIPE_PRICE_PRO) return "pro";
  if (priceId === env().STRIPE_PRICE_TEAM) return "team";
  return null;
}

async function ensureCustomer(account: Account, email: string | null): Promise<string> {
  if (account.stripeCustomerId) return account.stripeCustomerId;
  const customer = await stripe().customers.create({
    name: account.login,
    email: email ?? undefined,
    metadata: { accountId: account.id, githubLogin: account.login },
  });
  await db().update(accounts).set({ stripeCustomerId: customer.id }).where(eq(accounts.id, account.id));
  return customer.id;
}

export async function createCheckoutUrl(account: Account, plan: PaidPlan, email: string | null): Promise<string> {
  const { APP_URL } = env();
  const customer = await ensureCustomer(account, email);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: account.id,
    line_items: [{ price: priceForPlan(plan), quantity: 1 }],
    subscription_data: { metadata: { accountId: account.id } },
    allow_promotion_codes: true,
    success_url: `${APP_URL}/dashboard/${account.login}/billing?checkout=success`,
    cancel_url: `${APP_URL}/dashboard/${account.login}/billing`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalUrl(account: Account): Promise<string> {
  if (!account.stripeCustomerId) throw new Error("This account has no billing profile yet.");
  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${env().APP_URL}/dashboard/${account.login}/billing`,
  });
  return session.url;
}

const ENDED = new Set(["canceled", "incomplete_expired"]);

/**
 * Whether a subscription in the shared Stripe account is CodeReviewer's own. NEXORA Core's
 * subscriptions carry `orgId` metadata and are billed through Core, which tells CodeReviewer the
 * plan instead; other products' subscriptions use prices that are not ours.
 */
export function isOwnSubscription(subscription: Stripe.Subscription): boolean {
  if (subscription.metadata?.orgId) return false;
  if (subscription.metadata?.accountId) return true;
  return planForPrice(subscription.items.data[0]?.price.id) !== null;
}

/** Mirror a Stripe subscription onto the account it belongs to. */
export async function applySubscription(subscription: Stripe.Subscription) {
  if (!isOwnSubscription(subscription)) return;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const accountId = subscription.metadata?.accountId;

  const [account] = accountId
    ? await db().select().from(accounts).where(eq(accounts.id, accountId))
    : await db().select().from(accounts).where(eq(accounts.stripeCustomerId, customerId));
  if (!account) {
    console.warn(`[stripe] no account for subscription ${subscription.id}`);
    return;
  }
  // An old subscription ending must not wipe a newer one.
  if (
    account.stripeSubscriptionId &&
    account.stripeSubscriptionId !== subscription.id &&
    ENDED.has(subscription.status)
  ) {
    return;
  }

  const item = subscription.items.data[0];
  const plan = planForPrice(item?.price.id);
  const ended = ENDED.has(subscription.status) || !plan;
  await db()
    .update(accounts)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: ended ? null : subscription.id,
      subscriptionStatus: subscription.status,
      plan: ended ? "free" : plan,
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    })
    .where(eq(accounts.id, account.id));
}

export async function handleStripeEvent(event: Stripe.Event) {
  const [fresh] = await db()
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!fresh) return;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Only our own checkouts set client_reference_id; Core's and other products' sessions do not.
        if (session.mode === "subscription" && session.subscription && session.client_reference_id) {
          const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await applySubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;
    }
  } catch (error) {
    await db().delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    throw error;
  }
}
