import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/auth/github-oauth";
import { cookieOptions, randomToken, safeRedirectPath, STATE_COOKIE } from "@/lib/auth/session";
import { env, github } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  // The login page explains that sign-in is not available yet.
  if (!github()) return NextResponse.redirect(new URL("/login", env().APP_URL));
  const state = randomToken(24);
  const response = NextResponse.redirect(authorizeUrl(state));
  // The state cookie carries the post-login destination alongside the CSRF nonce.
  response.cookies.set(STATE_COOKIE, `${state}|${encodeURIComponent(next)}`, cookieOptions(600));
  return response;
}
