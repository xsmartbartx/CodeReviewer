import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, nexoraLinkRequests, nexoraOrgPlans, type Account, type User } from "@/db/schema";
import { hashToken, randomToken, safeEqual } from "@/lib/auth/session";
import { nexora } from "@/lib/env";
import { isPlan, ORG_ID } from "./org-plans";
import { GRANT_WINDOW_SECONDS, verify } from "./signature";

/**
 * Linking a CodeReviewer account (a GitHub installation) to a NEXORA organisation needs proof
 * from both sides in one browser (NEXORA ADR-0015):
 *
 * 1. GitHub: a sign-in at most FRESH_SIGN_IN_MS old (so GitHub has just confirmed who the user
 *    is and which installations they can access) by the account itself or the user who
 *    installed the app on it. A collaborator who can merely see the installation cannot link it.
 * 2. NEXORA: an organisation admin confirms in Console, which returns a grant signed with the
 *    secret CodeReviewer shares with Core.
 * 3. A single-use request, bound to this browser by a cookie nonce and to the signed-in user,
 *    ties the two together, so a grant cannot be replayed elsewhere or for another account.
 */
export const LINK_COOKIE = "cr_nexora_link";
export const LINK_MINUTES = 10;
export const FRESH_SIGN_IN_MS = 10 * 60 * 1000;

const NONCE = /^[A-Za-z0-9_-]{32,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who may link or unlink an account: the GitHub account itself, or whoever installed the app on it. */
export function canLink(
  user: Pick<User, "githubId">,
  account: Pick<Account, "githubAccountId" | "installerGithubId">,
): boolean {
  // A NEXORA sign-in has no GitHub id; null must never match an unrecorded installer.
  if (user.githubId === null) return false;
  return user.githubId === account.githubAccountId || user.githubId === account.installerGithubId;
}

export function isFreshSignIn(signedInAt: Date, now = new Date()): boolean {
  return now.getTime() - signedInAt.getTime() <= FRESH_SIGN_IN_MS;
}

/** Create the single-use link request and return the nonce for the cookie and the Console URL. */
export async function startLink(user: User, account: Account, now = new Date()) {
  const config = nexora();
  if (!config) throw new Error("NEXORA billing is not configured.");
  const nonce = randomToken(32);
  await db()
    .insert(nexoraLinkRequests)
    .values({
      id: hashToken(nonce),
      accountId: account.id,
      userId: user.id,
      expiresAt: new Date(now.getTime() + LINK_MINUTES * 60 * 1000),
    });
  const params = new URLSearchParams({ account: account.id, login: account.login, nonce });
  return { nonce, consoleUrl: `${config.consoleUrl}/link/codereviewer?${params}` };
}

export type Grant = { orgId: string; orgName: string; accountId: string; nonce: string; planId: Account["plan"] };

/** Verify and parse the grant Console signed. Null for anything that is not a valid, fresh grant. */
export function parseGrant(
  input: { grant: string | null; timestamp: string | null; signature: string | null },
  now?: number,
): Grant | null {
  const config = nexora();
  if (!config || !input.grant || input.grant.length > 2048) return null;
  const body = Buffer.from(input.grant, "base64url").toString("utf8");
  const valid = verify({
    secret: config.syncSecret,
    timestamp: input.timestamp,
    signature: input.signature,
    body,
    windowSeconds: GRANT_WINDOW_SECONDS,
    prefix: "link.",
    now,
  });
  if (!valid) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const { org_id, org_name, account_id, nonce, plan_id } = data ?? {};
  if (
    typeof org_id !== "string" ||
    !ORG_ID.test(org_id) ||
    typeof org_name !== "string" ||
    org_name.length > 200 ||
    typeof account_id !== "string" ||
    !UUID.test(account_id) ||
    typeof nonce !== "string" ||
    !NONCE.test(nonce) ||
    !isPlan(plan_id)
  ) {
    return null;
  }
  return { orgId: org_id, orgName: org_name, accountId: account_id, nonce, planId: plan_id };
}

export type LinkResult = { ok: true; account: Account } | { ok: false; reason: string };

/**
 * Apply a verified grant. The request it names is consumed whatever the outcome, so a grant
 * or nonce can be tried once only.
 */
export async function completeLink(
  grant: Grant,
  cookieNonce: string | undefined,
  user: User,
  now = new Date(),
): Promise<LinkResult> {
  if (!cookieNonce || !safeEqual(cookieNonce, grant.nonce)) return { ok: false, reason: "browser" };
  const [request] = await db()
    .delete(nexoraLinkRequests)
    .where(eq(nexoraLinkRequests.id, hashToken(grant.nonce)))
    .returning();
  if (!request || request.expiresAt <= now) return { ok: false, reason: "expired" };
  if (request.accountId !== grant.accountId || request.userId !== user.id) return { ok: false, reason: "mismatch" };

  const [account] = await db().select().from(accounts).where(eq(accounts.id, request.accountId));
  if (!account || !canLink(user, account)) return { ok: false, reason: "forbidden" };
  if (account.nexoraOrgId && account.nexoraOrgId !== grant.orgId) return { ok: false, reason: "linked" };

  const [linked] = await db()
    .update(accounts)
    .set({ nexoraOrgId: grant.orgId, nexoraOrgName: grant.orgName })
    .where(eq(accounts.id, account.id))
    .returning();
  // Core's pushes are authoritative and ordered by event time; the grant's plan only fills in
  // an organisation Core has not pushed yet (time zero, so any push replaces it).
  await db()
    .insert(nexoraOrgPlans)
    .values({ orgId: grant.orgId, plan: grant.planId, asOf: new Date(0) })
    .onConflictDoNothing();
  console.info(`[nexora] linked ${account.login} to ${grant.orgId} by ${user.login}`);
  return { ok: true, account: linked! };
}

/** Remove the link. The caller checks who may (canLink, or an admin of the organisation). */
export async function unlink(account: Account, by: User): Promise<boolean> {
  if (!account.nexoraOrgId) return false;
  await db()
    .update(accounts)
    .set({ nexoraOrgId: null, nexoraOrgName: null })
    .where(and(eq(accounts.id, account.id), eq(accounts.nexoraOrgId, account.nexoraOrgId)));
  console.info(`[nexora] unlinked ${account.login} from ${account.nexoraOrgId} by ${by.login}`);
  return true;
}
