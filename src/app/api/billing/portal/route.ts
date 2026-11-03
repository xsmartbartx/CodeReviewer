import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { currentViewer, isOrgAdmin } from "@/lib/auth/viewer";
import { createPortalUrl } from "@/lib/billing/stripe";
import { viewerCanAccess } from "@/lib/dashboard";
import { billingEnabled } from "@/lib/env";
import { isSameOrigin, redirectTo } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const viewer = await currentViewer();
  if (!viewer) return redirectTo("/login");
  // In an organisation, only its admins manage billing.
  if (viewer.kind === "nexora" && !isOrgAdmin(viewer)) return new Response("Forbidden", { status: 403 });
  if (!billingEnabled()) return new Response("Billing is not enabled", { status: 404 });

  const accountId = String((await request.formData()).get("accountId") ?? "");
  if (!(await viewerCanAccess(viewer, accountId))) return new Response("Not found", { status: 404 });
  const [account] = await db().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account?.stripeCustomerId) return redirectTo(`/dashboard/${account?.login ?? ""}/billing`);

  try {
    return Response.redirect(await createPortalUrl(account), 303);
  } catch (error) {
    console.error("[billing] portal failed", error);
    return redirectTo(`/dashboard/${account.login}/billing?error=portal`);
  }
}
