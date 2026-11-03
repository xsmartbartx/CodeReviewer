import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { currentSession } from "@/lib/auth/session";
import { userCanAccess } from "@/lib/dashboard";
import { env, nexora } from "@/lib/env";
import { completeLink, LINK_COOKIE, parseGrant } from "@/lib/nexora/link";

export const dynamic = "force-dynamic";

const invalid = () =>
  new Response("This link request is invalid or has expired. Start again from the account's billing page.", {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

/**
 * Step 2 of linking: Console sends the browser here with a grant it signed after an organisation
 * admin confirmed. It applies only together with the cookie nonce and the signed-in user that
 * started the request (src/lib/nexora/link.ts).
 */
export async function GET(request: NextRequest) {
  if (!nexora()) return new Response("Not found", { status: 404 });
  const params = request.nextUrl.searchParams;
  const grant = parseGrant({ grant: params.get("grant"), timestamp: params.get("ts"), signature: params.get("sig") });
  if (!grant) return invalid();
  const session = await currentSession();
  if (!session) return invalid();

  const result = await completeLink(grant, request.cookies.get(LINK_COOKIE)?.value, session.user);
  const [account] = await db().select({ login: accounts.login }).from(accounts).where(eq(accounts.id, grant.accountId));
  const destination =
    account && (await userCanAccess(session.user.id, grant.accountId))
      ? `/dashboard/${encodeURIComponent(account.login)}/billing?link=${result.ok ? "done" : result.reason}`
      : "/dashboard";
  const response = NextResponse.redirect(new URL(destination, env().APP_URL));
  response.cookies.delete(LINK_COOKIE);
  return response;
}
