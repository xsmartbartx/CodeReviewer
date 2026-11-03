import { PricingCards } from "@/components/pricing";
import { Button, Card, Meter, PageHeader } from "@/components/ui";
import { effectivePlan } from "@/lib/billing/plans";
import { requireAccount } from "@/lib/dashboard";
import { billingEnabled } from "@/lib/env";
import { reviewsUsed } from "@/lib/usage";
import { AccountNav } from "../nav";

type Props = {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ checkout?: string; error?: string }>;
};

export const metadata = { title: "Billing" };

export default async function BillingPage({ params, searchParams }: Props) {
  const { account } = await requireAccount((await params).account);
  const { checkout, error } = await searchParams;
  const billing = billingEnabled();
  const plan = effectivePlan(account, billing);
  const used = await reviewsUsed(account.id);

  return (
    <>
      <PageHeader title={account.login} description="Plan, usage, and invoices" />
      <AccountNav login={account.login} current="billing" />

      {!billing ? (
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
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="text-sm text-zinc-500">Current plan</h2>
              <p className="mt-1 text-2xl font-semibold">{plan.name}</p>
              {account.subscriptionStatus && account.subscriptionStatus !== "active" && (
                <p className="mt-1 text-sm text-amber-600">
                  Subscription status: {account.subscriptionStatus.replace(/_/g, " ")}
                </p>
              )}
              {account.currentPeriodEnd && plan.id !== "free" && (
                <p className="mt-1 text-sm text-zinc-500">
                  Renews {account.currentPeriodEnd.toLocaleDateString("en-US", { dateStyle: "long" })}
                </p>
              )}
              {account.stripeCustomerId && (
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
  );
}
