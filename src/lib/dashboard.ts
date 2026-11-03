import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, memberships, repositories, reviews, type Account, type User } from "@/db/schema";
import { currentViewer, type Viewer } from "@/lib/auth/viewer";
import { plansEnforced } from "@/lib/env";
import { accountPlan } from "@/lib/nexora/org-plans";
import { reviewsUsed } from "@/lib/usage";

export async function requireViewer(next = "/dashboard"): Promise<Viewer> {
  const viewer = await currentViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireUser(next = "/dashboard"): Promise<User> {
  return (await requireViewer(next)).user;
}

/**
 * The authorization boundary, one rule per kind of sign-in (src/lib/auth/viewer.ts): a GitHub
 * viewer sees the accounts whose installation GitHub says they can access (memberships, refreshed
 * at sign-in); a NEXORA viewer sees the accounts linked to their active organisation.
 */
async function visibleAccounts(viewer: Viewer, where?: SQL): Promise<Account[]> {
  if (viewer.kind === "nexora") {
    if (!viewer.orgId) return [];
    return db()
      .select()
      .from(accounts)
      .where(and(eq(accounts.nexoraOrgId, viewer.orgId), where))
      .orderBy(asc(accounts.login));
  }
  const rows = await db()
    .select({ account: accounts })
    .from(memberships)
    .innerJoin(accounts, eq(accounts.id, memberships.accountId))
    .where(and(eq(memberships.userId, viewer.user.id), where))
    .orderBy(asc(accounts.login));
  return rows.map((r) => r.account);
}

export async function accountsForViewer(viewer: Viewer) {
  const enforced = plansEnforced();
  return Promise.all(
    (await visibleAccounts(viewer)).map(async (account) => ({
      account,
      plan: await accountPlan(account, enforced),
      used: await reviewsUsed(account.id),
    })),
  );
}

export async function viewerCanAccess(viewer: Viewer, accountId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) return false;
  return (await visibleAccounts(viewer, eq(accounts.id, accountId))).length > 0;
}

/** The account with this login, if the viewer may see it. */
export async function accountForViewer(viewer: Viewer, login: string): Promise<Account | null> {
  const [account] = await visibleAccounts(viewer, sql`lower(${accounts.login}) = lower(${login})`);
  return account ?? null;
}

/** GitHub membership only: for the GitHub sign-in that linking an account requires. */
export async function userCanAccess(userId: string, accountId: string): Promise<boolean> {
  const [row] = await db()
    .select({ accountId: memberships.accountId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.accountId, accountId)))
    .limit(1);
  return Boolean(row);
}

/** The account with this login, if the GitHub user may see it. */
export async function accountForUser(userId: string, login: string): Promise<Account | null> {
  return accountForViewer({ kind: "github", user: { id: userId } as User }, login);
}

export async function requireAccount(login: string): Promise<{ viewer: Viewer; user: User; account: Account }> {
  const viewer = await requireViewer(`/dashboard/${login}`);
  const account = await accountForViewer(viewer, login);
  if (!account) notFound();
  return { viewer, user: viewer.user, account };
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
