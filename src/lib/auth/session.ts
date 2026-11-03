import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "cr_session";
export const STATE_COOKIE = "cr_oauth_state";
const SESSION_DAYS = 30;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Only same-origin relative paths, so `next` cannot redirect off-site. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function createSession(userId: string): Promise<{ token: string; maxAge: number }> {
  const token = randomToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await db()
    .insert(sessions)
    .values({ id: hashToken(token), userId, expiresAt: new Date(Date.now() + maxAge * 1000) });
  return { token, maxAge };
}

export type SignedInSession = { user: User; signedInAt: Date };

export async function sessionForToken(token: string | undefined): Promise<SignedInSession | null> {
  if (!token) return null;
  const [row] = await db()
    .select({ user: users, signedInAt: sessions.createdAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function userForToken(token: string | undefined): Promise<User | null> {
  return (await sessionForToken(token))?.user ?? null;
}

/** The signed-in session for this request, or null. Cached per request. */
export const currentSession = cache(async (): Promise<SignedInSession | null> => {
  const store = await cookies();
  return sessionForToken(store.get(SESSION_COOKIE)?.value);
});

/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<User | null> {
  return (await currentSession())?.user ?? null;
}

export async function destroySession(token: string | undefined) {
  if (token)
    await db()
      .delete(sessions)
      .where(eq(sessions.id, hashToken(token)));
}
