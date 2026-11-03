import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, syncUserFromToken } from "@/lib/auth/github-oauth";
import {
  cookieOptions,
  createSession,
  safeEqual,
  safeRedirectPath,
  SESSION_COOKIE,
  STATE_COOKIE,
} from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function fail(message: string) {
  const url = new URL("/login", env().APP_URL);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // GitHub sends users here after installing the app too; those requests carry no state.
  if (params.get("setup_action") && !params.get("code")) {
    return NextResponse.redirect(new URL("/dashboard", env().APP_URL));
  }

  const code = params.get("code");
  const state = params.get("state");
  const [expected, encodedNext] = (request.cookies.get(STATE_COOKIE)?.value ?? "").split("|");
  if (!code || !state || !expected || !safeEqual(state, expected)) {
    return fail("Sign-in expired. Please try again.");
  }

  try {
    const token = await exchangeCode(code);
    const user = await syncUserFromToken(token);
    const session = await createSession(user.id);
    const next = safeRedirectPath(decodeURIComponent(encodedNext ?? ""));
    const response = NextResponse.redirect(new URL(next, env().APP_URL));
    response.cookies.set(SESSION_COOKIE, session.token, cookieOptions(session.maxAge));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("[auth] callback failed", error);
    return fail("GitHub sign-in failed. Please try again.");
  }
}
