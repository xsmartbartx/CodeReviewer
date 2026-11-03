import { closeDb } from "@/db";
import { env } from "@/lib/env";
import { getBoss, REVIEW_QUEUE, stopQueue, type ReviewJob } from "@/lib/queue";
import { runMaintenance } from "./maintenance";
import { processReviewJob } from "./process";

const MAINTENANCE_QUEUE = "maintenance";

async function main() {
  const { WORKER_CONCURRENCY, ANTHROPIC_API_KEY } = env();
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required to run the worker.");

  const boss = await getBoss();
  await boss.createQueue(MAINTENANCE_QUEUE);
  await boss.schedule(MAINTENANCE_QUEUE, "17 3 * * *");

  await boss.work<ReviewJob>(REVIEW_QUEUE, { localConcurrency: WORKER_CONCURRENCY }, async ([job]) => {
    if (!job) return;
    const started = Date.now();
    const label = `${job.data.owner}/${job.data.repo}#${job.data.prNumber}`;
    try {
      const result = await processReviewJob(job.data, undefined, job.id);
      console.log(`[worker] ${label} ${result.status} in ${Date.now() - started}ms`);
    } catch (error) {
      console.error(`[worker] ${label} failed`, error);
      throw error;
    }
  });

  await boss.work(MAINTENANCE_QUEUE, async () => {
    await runMaintenance();
    console.log("[worker] maintenance complete");
  });

  console.log(`[worker] listening on ${REVIEW_QUEUE} with concurrency ${WORKER_CONCURRENCY}`);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[worker] ${signal} received, finishing active jobs`);
    await stopQueue();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
