import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { currentUser } from "@/lib/auth/session";
import { createPortalUrl } from "@/lib/billing/stripe";
import { userCanAccess } from "@/lib/dashboard";
import { billingEnabled } from "@/lib/env";
import { isSameOrigin, redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const user = await currentUser();
  if (!user) return redirectTo("/login");
  if (!billingEnabled()) return new Response("Billing is not enabled", { status: 404 });

  const accountId = String((await request.formData()).get("accountId") ?? "");
  if (!(await userCanAccess(user.id, accountId))) return new Response("Not found", { status: 404 });
  const [account] = await db().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account?.stripeCustomerId) return redirectTo(`/dashboard/${account?.login ?? ""}/billing`);

  try {
    return Response.redirect(await createPortalUrl(account), 303);
  } catch (error) {
    console.error("[billing] portal failed", error);
    return redirectTo(`/dashboard/${account.login}/billing?error=portal`);
  }
}
