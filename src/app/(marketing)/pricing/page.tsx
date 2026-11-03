import { PricingCards } from "@/components/pricing";
import { ButtonLink } from "@/components/ui";

export const metadata = {
  title: "Pricing",
  description: "Plans for AI pull request reviews on GitHub, starting free.",
};

const rows: Array<[string, string, string, string]> = [
  ["Reviews per month", "20", "250", "1,000"],
  ["Files per review", "50", "150", "300"],
  ["Repositories and developers", "Unlimited", "Unlimited", "Unlimited"],
  ["Inline comments and suggested fixes", "✓", "✓", "✓"],
  ["Summaries and walkthroughs", "✓", "✓", "✓"],
  ["Incremental reviews", "✓", "✓", "✓"],
  ["Request-changes workflow and checks", "✓", "✓", "✓"],
  ["Support", "Docs", "Email", "Priority email"],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-center text-4xl font-bold tracking-tight">Pricing</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-zinc-600 dark:text-zinc-400">
        Every plan covers all repositories and developers in one GitHub account or organization. Prices in USD, billed
        monthly.
      </p>
      <div className="mt-14">
        <PricingCards
          action={(plan) => (
            <ButtonLink
              href="/login?next=/dashboard"
              variant={plan.id === "pro" ? "primary" : "secondary"}
              className="w-full"
            >
              {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
            </ButtonLink>
          )}
        />
      </div>
      <div className="mt-20 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pr-4 font-semibold">Compare plans</th>
              <th className="px-4 py-3 font-semibold">Free</th>
              <th className="px-4 py-3 font-semibold">Pro</th>
              <th className="px-4 py-3 font-semibold">Team</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, ...values]) => (
              <tr key={label} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{label}</td>
                {values.map((v, i) => (
                  <td key={i} className="px-4 py-3">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-8 text-center text-sm text-zinc-500">
        Need more reviews, SSO, or an invoice? Email us and we will set up a custom plan.
      </p>
    </div>
  );
}
