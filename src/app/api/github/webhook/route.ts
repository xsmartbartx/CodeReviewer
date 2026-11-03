import { verify } from "@octokit/webhooks-methods";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookDeliveries } from "@/db/schema";
import { env } from "@/lib/env";
import { handleWebhook } from "@/lib/github/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  if (!signature || !event || !deliveryId) {
    return Response.json({ error: "Missing GitHub headers" }, { status: 400 });
  }
  const valid = await verify(env().GITHUB_WEBHOOK_SECRET, body, signature).catch(() => false);
  if (!valid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const inserted = await db()
    .insert(webhookDeliveries)
    .values({ id: deliveryId, event })
    .onConflictDoNothing()
    .returning({ id: webhookDeliveries.id });
  if (inserted.length === 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  try {
    await handleWebhook(event, JSON.parse(body));
  } catch (error) {
    // Forget the delivery so a redelivery from GitHub is processed again.
    await db().delete(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId));
    console.error(`[webhook] ${event} ${deliveryId} failed`, error);
    return Response.json({ error: "Webhook handling failed" }, { status: 500 });
  }
  return Response.json({ ok: true }, { status: 202 });
}
