import { and, asc, desc, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, memberships, repositories, reviews, type Account, type User } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { effectivePlan } from "@/lib/billing/plans";
import { billingEnabled } from "@/lib/env";
import { reviewsUsed } from "@/lib/usage";

export async function requireUser(next = "/dashboard"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function accountsForUser(userId: string) {
  const rows = await db()
    .select({ account: accounts })
    .from(memberships)
    .innerJoin(accounts, eq(accounts.id, memberships.accountId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(accounts.login));
  const billing = billingEnabled();
  return Promise.all(
    rows.map(async ({ account }) => ({
      account,
      plan: effectivePlan(account, billing),
      used: await reviewsUsed(account.id),
    })),
  );
}

/** Membership is the only authorization boundary: users see accounts whose installation they can access. */
export async function userCanAccess(userId: string, accountId: string): Promise<boolean> {
  const [row] = await db()
    .select({ accountId: memberships.accountId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.accountId, accountId)))
    .limit(1);
  return Boolean(row);
}

export async function requireAccount(login: string): Promise<{ user: User; account: Account }> {
  const user = await requireUser(`/dashboard/${login}`);
  const rows = await db()
    .select({ account: accounts })
    .from(memberships)
    .innerJoin(accounts, eq(accounts.id, memberships.accountId))
    .where(and(eq(memberships.userId, user.id), sql`lower(${accounts.login}) = lower(${login})`))
    .limit(1);
  if (!rows[0]) notFound();
  return { user, account: rows[0].account };
}

export function reposForAccount(accountId: string) {
  return db()
    .select()
    .from(repositories)
    .where(and(eq(repositories.accountId, accountId), eq(repositories.active, true)))
    .orderBy(asc(repositories.fullName));
}

export function recentReviews(accountId: string, limit = 25) {
  return db()
    .select({ review: reviews, repoName: repositories.fullName })
    .from(reviews)
    .innerJoin(repositories, eq(repositories.id, reviews.repositoryId))
    .where(eq(reviews.accountId, accountId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export async function reviewForAccount(accountId: string, reviewId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) return null;
  const [row] = await db()
    .select({ review: reviews, repoName: repositories.fullName })
    .from(reviews)
    .innerJoin(repositories, eq(repositories.id, reviews.repositoryId))
    .where(and(eq(reviews.accountId, accountId), eq(reviews.id, reviewId)))
    .limit(1);
  return row ?? null;
}
