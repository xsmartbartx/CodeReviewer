import { PricingCards } from "@/components/pricing";
import { Button, Card, Meter, PageHeader } from "@/components/ui";
import type { Account, User } from "@/db/schema";
import { effectivePlan, PLANS } from "@/lib/billing/plans";
import { requireAccount } from "@/lib/dashboard";
import { billingEnabled, nexora, type NexoraConfig } from "@/lib/env";
import { canLink } from "@/lib/nexora/link";
import { linkedOrgPlan } from "@/lib/nexora/org-plans";
import { reviewsUsed } from "@/lib/usage";
import { unlinkNexora } from "../../actions";
import { AccountNav } from "../nav";

type Props = {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ checkout?: string; error?: string; link?: string }>;
};

export const metadata = { title: "Billing" };

const LINK_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> = {
  done: { tone: "ok", text: "Linked. The organisation's CodeReviewer plan now applies to this account." },
  removed: { tone: "ok", text: "This account is no longer billed through a NEXORA organisation." },
  forbidden: {
    tone: "error",
    text: "Only the GitHub account itself, or the person who installed CodeReviewer on it, can link or unlink it.",
  },
  linked: { tone: "error", text: "This account is already linked to a NEXORA organisation. Unlink it first." },
  expired: { tone: "error", text: "The link request expired. Please start again." },
  browser: { tone: "error", text: "The link request was started in another browser. Please start again here." },
  mismatch: { tone: "error", text: "The link request did not match this account or user. Please start again." },
};

export default async function BillingPage({ params, searchParams }: Props) {
  const { user, account } = await requireAccount((await params).account);
  const { checkout, error, link } = await searchParams;
  const billing = billingEnabled();
  const nexoraConfig = nexora();
  const enforced = billing || nexoraConfig !== null;
  const orgPlan = await linkedOrgPlan(account);
  const plan = effectivePlan(account, enforced, orgPlan);
  const used = await reviewsUsed(account.id);
  const linkMessage = link ? LINK_MESSAGES[link] : undefined;

  return (
    <>
      <PageHeader title={account.login} description="Plan, usage, and invoices" />
      <AccountNav login={account.login} current="billing" />

      {!enforced ? (
        <Card>
          <h2 className="font-semibold">Billing is turned off</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This instance runs without Stripe, so every account has unlimited reviews. Set the Stripe environment
            variables to enable plans.
          </p>
        </Card>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error === "portal" ? "The billing portal" : "Checkout"} could not be opened. Please try again in a
              moment, or contact support if it keeps happening.
            </div>
          )}
          {checkout === "success" && (
            <div
              role="status"
              className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            >
              Thanks! Your subscription is active. It can take a few seconds for the new plan to appear.
            </div>
          )}
          {linkMessage && (
            <div
              role={linkMessage.tone === "ok" ? "status" : "alert"}
              className={`mb-6 rounded-lg border p-4 text-sm ${
                linkMessage.tone === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {linkMessage.text}
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-sm text-zinc-500">Current plan</h2>
              <p className="mt-1 text-2xl font-semibold">{plan.name}</p>
              {account.subscriptionStatus && account.subscriptionStatus !== "active" && (
                <p className="mt-1 text-sm text-amber-600">
                  Subscription status: {account.subscriptionStatus.replace(/_/g, " ")}
                </p>
              )}
              {account.currentPeriodEnd && account.plan !== "free" && (
                <p className="mt-1 text-sm text-zinc-500">
                  Renews {account.currentPeriodEnd.toLocaleDateString("en-US", { dateStyle: "long" })}
                </p>
              )}
              {billing && account.stripeCustomerId && (
                <form action="/api/billing/portal" method="post" className="mt-4">
                  <input type="hidden" name="accountId" value={account.id} />
                  <Button variant="secondary">Manage billing and invoices</Button>
                </form>
              )}
            </Card>
            <Card>
              <Meter value={used} max={plan.reviewsPerMonth} label="Reviews this month" />
              <p className="mt-3 text-xs text-zinc-500">Quotas reset on the 1st of each month (UTC).</p>
            </Card>
          </div>

          {nexoraConfig && <NexoraBilling config={nexoraConfig} user={user} account={account} orgPlan={orgPlan} />}

          {billing && !account.nexoraOrgId && (
            <>
              <h2 className="mt-10 mb-6 font-semibold">Plans</h2>
              <PricingCards
                current={plan.id}
                action={(p) => {
                  if (p.id === plan.id) {
                    return (
                      <Button variant="secondary" disabled className="w-full">
                        Current plan
                      </Button>
                    );
                  }
                  if (p.id === "free") {
                    return account.stripeCustomerId ? (
                      <form action="/api/billing/portal" method="post">
                        <input type="hidden" name="accountId" value={account.id} />
                        <Button variant="secondary" className="w-full">
                          Cancel subscription
                        </Button>
                      </form>
                    ) : null;
                  }
                  return (
                    <form action="/api/billing/checkout" method="post">
                      <input type="hidden" name="accountId" value={account.id} />
                      <input type="hidden" name="plan" value={p.id} />
                      <Button className="w-full" variant={p.id === "pro" ? "primary" : "secondary"}>
                        {plan.id === "free" ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                      </Button>
                    </form>
                  );
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

/** Billing through a NEXORA organisation: link, unlink, and where the plan is managed. */
function NexoraBilling({
  config,
  user,
  account,
  orgPlan,
}: {
  config: NexoraConfig;
  user: User;
  account: Account;
  orgPlan: Account["plan"] | null;
}) {
  const allowed = canLink(user, account);
  const ownPaid = account.plan !== "free" && account.stripeSubscriptionId !== null;
  const start = `/api/auth/login?next=${encodeURIComponent(
    `/api/nexora/link/continue?account=${encodeURIComponent(account.login)}`,
  )}`;

  return (
    <Card className="mt-6">
      <h2 className="font-semibold">NEXORA organisation</h2>
      {account.nexoraOrgId ? (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Billed through <strong>{account.nexoraOrgName ?? account.nexoraOrgId}</strong>, with its other NEXORA
            products. Its CodeReviewer plan: {orgPlan ? PLANS[orgPlan].name : "not received yet"}. Change the plan in
            NEXORA Console.
          </p>
          {ownPaid && (
            <p className="mt-2 text-sm text-amber-600">
              This account also has its own subscription. The higher of the two plans applies; cancel one of them so you
              do not pay twice.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`${config.consoleUrl}/billing`}
              className="bg-brand-600 hover:bg-brand-700 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Open Console billing
            </a>
            {allowed && (
              <form action={unlinkNexora}>
                <input type="hidden" name="accountId" value={account.id} />
                <Button variant="secondary">Unlink</Button>
              </form>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Pay for CodeReviewer together with your other NEXORA products: link this account to your organisation and
            choose its plan in NEXORA Console. You sign in with GitHub again, then an organisation admin confirms in
            Console.
          </p>
          {allowed ? (
            // A plain link: the target is a route handler that starts GitHub sign-in, never prefetched.
            <a
              href={start}
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Link to a NEXORA organisation
            </a>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Only {account.login} itself, or the person who installed CodeReviewer on it, can link it.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
