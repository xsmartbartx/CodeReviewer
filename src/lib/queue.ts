import { PgBoss } from "pg-boss";
import { env } from "@/lib/env";

export const REVIEW_QUEUE = "review-pull-request";

export type ReviewJob = {
  installationId: number;
  repoGithubId: number;
  owner: string;
  repo: string;
  prNumber: number;
  trigger: "auto" | "command";
  /** Ignore the last reviewed commit and review the whole pull request. */
  full: boolean;
};

export interface JobQueue {
  enqueueReview(job: ReviewJob): Promise<string | null>;
}

let boss: PgBoss | undefined;
let starting: Promise<PgBoss> | undefined;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  starting ??= (async () => {
    const instance = new PgBoss({ connectionString: env().DATABASE_URL, schema: "pgboss" });
    instance.on("error", (error) => console.error("[queue]", error));
    await instance.start();
    await instance.createQueue(REVIEW_QUEUE, {
      // One queued and one running job per pull request; the worker always
      // reviews the latest head, so extra pushes while queued collapse into one.
      policy: "stately",
      retryLimit: 2,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 20 * 60,
    });
    boss = instance;
    return instance;
  })();
  return starting;
}

const pgBossQueue: JobQueue = {
  async enqueueReview(job) {
    const instance = await getBoss();
    return instance.send(REVIEW_QUEUE, job, { singletonKey: `${job.repoGithubId}:${job.prNumber}` });
  },
};

let override: JobQueue | undefined;

export function queue(): JobQueue {
  return override ?? pgBossQueue;
}

export function setQueueForTesting(q: JobQueue | undefined) {
  override = q;
}

export async function stopQueue() {
  await boss?.stop({ graceful: true });
  boss = undefined;
  starting = undefined;
}
