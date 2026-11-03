import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { currentViewer, isOrgAdmin } from "@/lib/auth/viewer";
import { createCheckoutUrl, createPortalUrl, type PaidPlan } from "@/lib/billing/stripe";
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

  const form = await request.formData();
  const accountId = String(form.get("accountId") ?? "");
  const plan = String(form.get("plan") ?? "") as PaidPlan;
  if (!["pro", "team"].includes(plan) || !(await viewerCanAccess(viewer, accountId))) {
    return new Response("Not found", { status: 404 });
  }

  const [account] = await db().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return new Response("Not found", { status: 404 });

  try {
    // Plan changes for an existing subscription go through the portal, which prorates.
    const url = account.stripeSubscriptionId
      ? await createPortalUrl(account)
      : await createCheckoutUrl(account, plan, viewer.user.email);
    return Response.redirect(url, 303);
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return redirectTo(`/dashboard/${account.login}/billing?error=checkout`);
  }
}
