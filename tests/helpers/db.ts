import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { setDbForTesting, type Db } from "@/db";
import * as schema from "@/db/schema";

/** Fresh in-memory Postgres with all migrations applied, installed as the app database. */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  setDbForTesting(testDb as unknown as Db);
  return testDb as unknown as Db;
}
