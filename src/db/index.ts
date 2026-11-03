import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let pool: pg.Pool | undefined;
let instance: Db | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: env().DATABASE_URL, max: 10 });
  }
  return pool;
}

export function db(): Db {
  if (!instance) {
    instance = drizzle(getPool(), { schema });
  }
  return instance;
}

/** Tests swap in an in-process PGlite database. */
export function setDbForTesting(testDb: Db | undefined) {
  instance = testDb;
}

export async function closeDb() {
  await pool?.end();
  pool = undefined;
  instance = undefined;
}

export { schema };
