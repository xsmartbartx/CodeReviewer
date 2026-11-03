import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { nexoraOrgPlans, type Account, type Plan } from "@/db/schema";
import { effectivePlan, type PlanDefinition } from "@/lib/billing/plans";
import { nexora, plansEnforced } from "@/lib/env";

/** Clerk organisation ids, as Core sends them. */
export const ORG_ID = /^org_[A-Za-z0-9]{10,64}$/;
export const PLAN_IDS: readonly Plan[] = ["free", "pro", "team"];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/**
 * Store the plan Core says an organisation has. Stripe does not deliver events in order, so an
 * update older than the stored one is ignored ("stale"). Equal times apply again, which makes a
 * redelivered event idempotent.
 */
export async function applyOrgPlan(orgId: string, plan: Plan, asOf: Date): Promise<"applied" | "stale"> {
  const rows = await db()
    .insert(nexoraOrgPlans)
    .values({ orgId, plan, asOf })
    .onConflictDoUpdate({
      target: nexoraOrgPlans.orgId,
      set: { plan, asOf, updatedAt: new Date() },
      setWhere: sql`${nexoraOrgPlans.asOf} <= ${asOf}`,
    })
    .returning({ orgId: nexoraOrgPlans.orgId });
  return rows.length > 0 ? "applied" : "stale";
}

/**
 * The plan of the organisation an account is linked to, or null when it is not linked, Core has
 * never sent one, or the NEXORA integration is off (unsetting the secret is the rollback).
 */
export async function linkedOrgPlan(account: Pick<Account, "nexoraOrgId">): Promise<Plan | null> {
  if (!account.nexoraOrgId || !nexora()) return null;
  const [row] = await db()
    .select({ plan: nexoraOrgPlans.plan })
    .from(nexoraOrgPlans)
    .where(eq(nexoraOrgPlans.orgId, account.nexoraOrgId));
  return row?.plan ?? null;
}

/** The account's effective plan: its own subscription or its organisation's, whichever is higher. */
export async function accountPlan(account: Account, enforced = plansEnforced()): Promise<PlanDefinition> {
  return effectivePlan(account, enforced, await linkedOrgPlan(account));
}
