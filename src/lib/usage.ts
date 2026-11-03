import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { periodStart } from "@/lib/billing/plans";

/** Completed reviews this billing period. Skipped and failed reviews are free. */
export async function reviewsUsed(accountId: string, now = new Date()): Promise<number> {
  const [row] = await db()
    .select({ value: count() })
    .from(reviews)
    .where(
      and(eq(reviews.accountId, accountId), eq(reviews.status, "completed"), gte(reviews.createdAt, periodStart(now))),
    );
  return row?.value ?? 0;
}

export async function lastReviewedSha(repositoryId: string, prNumber: number): Promise<string | null> {
  const [row] = await db()
    .select({ headSha: reviews.headSha })
    .from(reviews)
    .where(and(eq(reviews.repositoryId, repositoryId), eq(reviews.prNumber, prNumber), eq(reviews.status, "completed")))
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return row?.headSha ?? null;
}
