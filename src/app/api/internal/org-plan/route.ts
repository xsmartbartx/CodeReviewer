import { nexora } from "@/lib/env";
import { applyOrgPlan, isPlan, ORG_ID } from "@/lib/nexora/org-plans";
import { SYNC_WINDOW_SECONDS, verify } from "@/lib/nexora/signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 1024;

/**
 * NEXORA Core tells CodeReviewer the plan an organisation has: Core owns the subscription of an
 * organisation it bills (checkout in Console, Stripe webhook in Core; NEXORA ADR-0015, phase 2).
 *
 * Not a user-facing route: authenticated by an HMAC signature over the exact body, not a session,
 * and 404 until `NEXORA_SYNC_SECRET` is set. Idempotent, so Core's webhook can be redelivered.
 */
export async function POST(request: Request) {
  const config = nexora();
  if (!config) return new Response("Not found", { status: 404 });

  const unauthorized = () => Response.json({ error: "invalid signature" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return unauthorized();
  const body = await request.text();
  if (
    body.length > MAX_BODY ||
    !verify({
      secret: config.syncSecret,
      timestamp: request.headers.get("x-nexora-timestamp"),
      signature: request.headers.get("x-nexora-signature"),
      body,
      windowSeconds: SYNC_WINDOW_SECONDS,
    })
  ) {
    return unauthorized();
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
  const { clerk_org_id: orgId, plan_id: plan, as_of: asOf } = payload ?? {};
  if (
    typeof orgId !== "string" ||
    !ORG_ID.test(orgId) ||
    !isPlan(plan) ||
    typeof asOf !== "number" ||
    !Number.isInteger(asOf) ||
    asOf <= 0
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const status = await applyOrgPlan(orgId, plan, new Date(asOf * 1000));
  console.info(`[nexora] org plan ${orgId} -> ${plan} (${status})`);
  return Response.json({ status });
}
