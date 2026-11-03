import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // The GitHub App is optional so the site can run before the app is registered;
  // sign-in, webhooks, and reviews stay off until all six are set (see github()).
  GITHUB_APP_ID: optional,
  GITHUB_APP_SLUG: optional,
  // PEM contents. Newlines may be escaped as \n so the key fits on one env line.
  GITHUB_APP_PRIVATE_KEY: optional.transform((v) => v?.replace(/\\n/g, "\n")),
  GITHUB_WEBHOOK_SECRET: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,

  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  ANTHROPIC_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("medium"),

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_PRICE_PRO: optional,
  STRIPE_PRICE_TEAM: optional,

  // NEXORA Core billing (docs/nexora-integration.md). Off until the shared secret is set.
  NEXORA_SYNC_SECRET: optional,
  NEXORA_CONSOLE_URL: z.url().default("https://console.onenexora.com"),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(3),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Parsed, validated environment. Parsed lazily so `next build` works without
 * runtime secrets; the first request or worker start fails loudly instead.
 */
export function env(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    cached = result.data;
  }
  return cached;
}

export function resetEnvForTesting() {
  cached = undefined;
}

export type GitHubConfig = {
  appId: string;
  slug: string;
  privateKey: string;
  webhookSecret: string;
  clientId: string;
  clientSecret: string;
};

/** The GitHub App credentials, or null until every one of them is set. */
export function github(e: Env = env()): GitHubConfig | null {
  const {
    GITHUB_APP_ID,
    GITHUB_APP_SLUG,
    GITHUB_APP_PRIVATE_KEY,
    GITHUB_WEBHOOK_SECRET,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
  } = e;
  if (
    !GITHUB_APP_ID ||
    !GITHUB_APP_SLUG ||
    !GITHUB_APP_PRIVATE_KEY ||
    !GITHUB_WEBHOOK_SECRET ||
    !GITHUB_CLIENT_ID ||
    !GITHUB_CLIENT_SECRET
  ) {
    return null;
  }
  return {
    appId: GITHUB_APP_ID,
    slug: GITHUB_APP_SLUG,
    privateKey: GITHUB_APP_PRIVATE_KEY,
    webhookSecret: GITHUB_WEBHOOK_SECRET,
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
  };
}

/** For code paths that only run once the app is set up (webhooks, signed-in pages, the worker). */
export function requireGitHub(e: Env = env()): GitHubConfig {
  const config = github(e);
  if (!config) throw new Error("The GitHub App is not configured. Set the six GITHUB_* environment variables.");
  return config;
}

/** Billing is on only when every Stripe variable is present. Self-hosters can leave it off. */
export function billingEnabled(e: Env = env()): boolean {
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET && e.STRIPE_PRICE_PRO && e.STRIPE_PRICE_TEAM);
}

export type NexoraConfig = { syncSecret: string; consoleUrl: string };

/** NEXORA Core billing: org plans pushed by Core and account linking. Null until the shared secret is set. */
export function nexora(e: Env = env()): NexoraConfig | null {
  if (!e.NEXORA_SYNC_SECRET) return null;
  return { syncSecret: e.NEXORA_SYNC_SECRET, consoleUrl: e.NEXORA_CONSOLE_URL.replace(/\/$/, "") };
}

/** Plans and quotas apply when either CodeReviewer's own Stripe billing or NEXORA billing is on. */
export function plansEnforced(e: Env = env()): boolean {
  return billingEnabled(e) || nexora(e) !== null;
}
