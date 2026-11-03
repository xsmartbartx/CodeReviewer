import type { Plan } from "@/db/schema";

export type PlanDefinition = {
  id: Plan;
  name: string;
  priceMonthly: number;
  reviewsPerMonth: number;
  maxFilesPerReview: number;
  tagline: string;
  features: string[];
};

/**
 * One place to tune pricing. Each review costs roughly $0.05-$0.25 in model usage
 * depending on diff size and model, so keep reviewsPerMonth x cost under the price.
 */
export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    reviewsPerMonth: 20,
    maxFilesPerReview: 50,
    tagline: "For side projects and trying it out.",
    features: [
      "20 reviews per month",
      "Public and private repositories",
      "Inline comments and summaries",
      "Up to 50 files per review",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 39,
    reviewsPerMonth: 250,
    maxFilesPerReview: 150,
    tagline: "For small teams shipping every day.",
    features: [
      "250 reviews per month",
      "Incremental reviews on every push",
      "Request-changes workflow and checks",
      "Up to 150 files per review",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 149,
    reviewsPerMonth: 1000,
    maxFilesPerReview: 300,
    tagline: "For organizations with many repositories.",
    features: ["1,000 reviews per month", "Everything in Pro", "Up to 300 files per review", "Priority email support"],
  },
};

export const SELF_HOSTED_PLAN: PlanDefinition = {
  id: "team",
  name: "Self-hosted",
  priceMonthly: 0,
  reviewsPerMonth: Number.POSITIVE_INFINITY,
  maxFilesPerReview: 300,
  tagline: "Billing disabled.",
  features: [],
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/** The plan an account is entitled to right now, accounting for lapsed subscriptions. */
export function effectivePlan(
  account: { plan: Plan; subscriptionStatus: string | null },
  billing: boolean,
): PlanDefinition {
  if (!billing) return SELF_HOSTED_PLAN;
  if (account.plan === "free") return PLANS.free;
  return account.subscriptionStatus && ACTIVE_STATUSES.has(account.subscriptionStatus)
    ? PLANS[account.plan]
    : PLANS.free;
}

/** Quotas reset on the first day of each calendar month (UTC). */
export function periodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
