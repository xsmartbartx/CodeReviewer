import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts } from "@/db/schema";
import { createTestDb } from "./helpers/db";

describe("database schema", () => {
  it("applies migrations and round-trips an account", async () => {
    const db = await createTestDb();
    await db.insert(accounts).values({ githubAccountId: 1, login: "acme", installationId: 99 });
    const [row] = await db.select().from(accounts).where(eq(accounts.login, "acme"));
    expect(row?.plan).toBe("free");
    expect(row?.installationId).toBe(99);
  });
});
