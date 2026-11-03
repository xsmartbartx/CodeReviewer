import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { clerk } from "@/lib/env";
import { currentSession } from "./session";

/**
 * Who is looking at the dashboard. The two sign-ins never mix in one request:
 *
 * - `github`: signed in with GitHub (CodeReviewer's own session cookie). Sees the
 *   installations GitHub lists for them, as before NEXORA sign-in existed.
 * - `nexora`: signed in with their NEXORA account (Clerk). Sees exactly the accounts linked
 *   to their active organisation; admins of it manage billing and links (NEXORA ADR-0015).
 *
 * A GitHub session wins when both exist, so the GitHub sign-in that linking needs never
 * changes what an organisation member sees until they sign out of it.
 */
export type Viewer =
  | { kind: "github"; user: User }
  | { kind: "nexora"; user: User; orgId: string | null; orgRole: string | null; sessionId: string };

export const ORG_ADMIN = "org:admin";

export const currentViewer = cache(async (): Promise<Viewer | null> => {
  const session = await currentSession();
  if (session) return { kind: "github", user: session.user };
  return nexoraViewer();
});

async function nexoraViewer(): Promise<Viewer | null> {
  if (!clerk()) return null;
  let claims: Awaited<ReturnType<typeof auth>>;
  try {
    claims = await auth();
  } catch (error) {
    // auth() throws when the proxy did not run for this request; treat it as signed out.
    console.warn("[auth] NEXORA sign-in unavailable for this request", error);
    return null;
  }
  if (!claims.userId || !claims.sessionId) return null;
  const user = await userForClerkId(claims.userId);
  return {
    kind: "nexora",
    user,
    orgId: claims.orgId ?? null,
    orgRole: claims.orgRole ?? null,
    sessionId: claims.sessionId,
  };
}

/** The CodeReviewer user for a Clerk user, created with their profile on first visit. */
export async function userForClerkId(clerkUserId: string): Promise<User> {
  const [existing] = await db().select().from(users).where(eq(users.clerkUserId, clerkUserId));
  if (existing) return existing;

  const profile = await (await clerkClient()).users.getUser(clerkUserId);
  const email = profile.primaryEmailAddress?.emailAddress ?? null;
  const values = {
    clerkUserId,
    login: profile.username ?? email?.split("@")[0] ?? clerkUserId,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
    email,
    avatarUrl: profile.imageUrl ?? null,
  };
  const [row] = await db()
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.clerkUserId, set: values })
    .returning();
  return row!;
}

export function isOrgAdmin(viewer: Viewer): boolean {
  return viewer.kind === "nexora" && viewer.orgId !== null && viewer.orgRole === ORG_ADMIN;
}

/** Ends a NEXORA sign-in everywhere (it is one session across NEXORA apps). */
export async function signOutNexora(viewer: Viewer) {
  if (viewer.kind !== "nexora") return;
  await (await clerkClient()).sessions.revokeSession(viewer.sessionId);
}
