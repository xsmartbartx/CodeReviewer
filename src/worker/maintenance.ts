import { lt } from "drizzle-orm";
import { db } from "@/db";
import { reviews, sessions, stripeEvents, webhookDeliveries } from "@/db/schema";

const DAY = 24 * 60 * 60 * 1000;

/** Delete expired rows, idempotency records, and review history past the retention period in the privacy policy. */
export async function runMaintenance(now = new Date()) {
  await db().delete(sessions).where(lt(sessions.expiresAt, now));
  await db()
    .delete(webhookDeliveries)
    .where(lt(webhookDeliveries.receivedAt, new Date(now.getTime() - 7 * DAY)));
  await db()
    .delete(stripeEvents)
    .where(lt(stripeEvents.receivedAt, new Date(now.getTime() - 30 * DAY)));
  await db()
    .delete(reviews)
    .where(lt(reviews.createdAt, new Date(now.getTime() - 730 * DAY)));
}
