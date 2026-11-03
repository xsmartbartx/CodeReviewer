import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/auth/github-oauth";
import { cookieOptions, randomToken, safeRedirectPath, STATE_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const state = randomToken(24);
  const response = NextResponse.redirect(authorizeUrl(state));
  // The state cookie carries the post-login destination alongside the CSRF nonce.
  response.cookies.set(STATE_COOKIE, `${state}|${encodeURIComponent(next)}`, cookieOptions(600));
  return response;
}
