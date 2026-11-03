import { handleStripeEvent, stripe } from "@/lib/billing/stripe";
import { billingEnabled, env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!billingEnabled()) return new Response("Billing is not enabled", { status: 404 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, env().STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(`[stripe] ${event.type} ${event.id} failed`, error);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}
