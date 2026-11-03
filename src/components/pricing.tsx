import type { ReactNode } from "react";
import { PLANS, type PlanDefinition } from "@/lib/billing/plans";

export function PricingCards({
  action,
  highlight = "pro",
  current,
}: {
  action: (plan: PlanDefinition) => ReactNode;
  highlight?: PlanDefinition["id"];
  current?: PlanDefinition["id"];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {Object.values(PLANS).map((plan) => {
        const featured = plan.id === highlight;
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              featured
                ? "border-brand-600 ring-brand-600 bg-white shadow-lg ring-1 dark:bg-zinc-900"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            {featured && (
              <span className="bg-brand-600 absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-medium text-white">
                Most popular
              </span>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {current === plan.id && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  Current
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{plan.tagline}</p>
            <p className="mt-6">
              <span className="text-4xl font-bold tracking-tight">${plan.priceMonthly}</span>
              <span className="text-sm text-zinc-500"> / month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <svg
                    viewBox="0 0 20 20"
                    className="text-brand-600 mt-0.5 size-4 shrink-0"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">{action(plan)}</div>
          </div>
        );
      })}
    </div>
  );
}
