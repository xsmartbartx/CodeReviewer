import { NextResponse, type NextRequest } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";
import { currentViewer, signOutNexora } from "@/lib/auth/viewer";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Ends the sign-in this request is using: a GitHub session is CodeReviewer's own; without one,
 * a NEXORA sign-in is ended everywhere, since it is one session across NEXORA apps.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySession(token);
  } else {
    const viewer = await currentViewer();
    if (viewer?.kind === "nexora") await signOutNexora(viewer);
  }
  const response = NextResponse.redirect(new URL("/", env().APP_URL), { status: 303 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
