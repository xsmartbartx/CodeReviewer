import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, db } from "./index";

async function main() {
  // Resolved against the working directory so the bundled script works from the app root.
  await migrate(db() as Parameters<typeof migrate>[0], { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
  await closeDb();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
