import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, currentSession } from "@/lib/auth/session";
import { accountForUser } from "@/lib/dashboard";
import { env, nexora } from "@/lib/env";
import { canLink, isFreshSignIn, LINK_COOKIE, LINK_MINUTES, startLink } from "@/lib/nexora/link";

export const dynamic = "force-dynamic";

/**
 * Step 1 of linking an account to a NEXORA organisation. The billing page sends the user through
 * GitHub sign-in with this route as the destination, so GitHub has just confirmed who they are
 * and refreshed which installations they can access. Then the user is sent to Console, where an
 * organisation admin confirms (see src/lib/nexora/link.ts).
 */
export async function GET(request: NextRequest) {
  if (!nexora()) return new Response("Not found", { status: 404 });
  const login = request.nextUrl.searchParams.get("account") ?? "";
  const back = (result: string) =>
    NextResponse.redirect(new URL(`/dashboard/${encodeURIComponent(login)}/billing?link=${result}`, env().APP_URL));

  const session = await currentSession();
  if (!session || !isFreshSignIn(session.signedInAt)) {
    const next = `/api/nexora/link/continue?account=${encodeURIComponent(login)}`;
    return NextResponse.redirect(new URL(`/api/auth/login?next=${encodeURIComponent(next)}`, env().APP_URL));
  }

  const account = await accountForUser(session.user.id, login);
  if (!account) return NextResponse.redirect(new URL("/dashboard", env().APP_URL));
  if (!canLink(session.user, account)) return back("forbidden");
  if (account.nexoraOrgId) return back("linked");

  const { nonce, consoleUrl } = await startLink(session.user, account);
  const response = NextResponse.redirect(consoleUrl);
  response.cookies.set(LINK_COOKIE, nonce, cookieOptions(LINK_MINUTES * 60));
  return response;
}
