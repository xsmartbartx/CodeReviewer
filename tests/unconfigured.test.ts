import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as login } from "@/app/api/auth/login/route";
import { POST as webhook } from "@/app/api/github/webhook/route";
import { env, github, requireGitHub, resetEnvForTesting } from "@/lib/env";

const GITHUB_KEYS = [
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of GITHUB_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  // An empty value, as in a freshly created .env, counts as not set.
  process.env.GITHUB_APP_ID = "";
  resetEnvForTesting();
});

afterAll(() => {
  for (const key of GITHUB_KEYS) process.env[key] = saved[key];
  resetEnvForTesting();
});

describe("without a GitHub App", () => {
  it("still loads the environment", () => {
    expect(env().DATABASE_URL).toBeTruthy();
    expect(github()).toBeNull();
    expect(() => requireGitHub()).toThrow(/GITHUB_\*/);
  });

  it("sends sign-in back to the login page", async () => {
    const res = await login(new NextRequest("http://localhost:3000/api/auth/login?next=/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("answers webhooks with 503", async () => {
    const res = await webhook(new Request("http://localhost/api/github/webhook", { method: "POST", body: "{}" }));
    expect(res.status).toBe(503);
  });
});

describe("with a partial GitHub App", () => {
  it("treats any missing value as not configured", () => {
    process.env.GITHUB_APP_ID = "1";
    resetEnvForTesting();
    expect(github()).toBeNull();
    process.env.GITHUB_APP_ID = "";
    resetEnvForTesting();
  });
});
