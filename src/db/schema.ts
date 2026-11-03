import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const planEnum = pgEnum("plan", ["free", "pro", "team"]);
export const reviewStatusEnum = pgEnum("review_status", ["queued", "running", "completed", "failed", "skipped"]);
export const reviewTriggerEnum = pgEnum("review_trigger", ["auto", "command"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Set for people who signed in with GitHub; null for NEXORA (Clerk) sign-ins. */
  githubId: bigint("github_id", { mode: "number" }).unique(),
  /** Set for people who signed in with their NEXORA account. */
  clerkUserId: text("clerk_user_id").unique(),
  login: text("login").notNull(),
  name: text("name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the raw token is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** A GitHub user or organization that installed the app. Billing attaches here. */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubAccountId: bigint("github_account_id", { mode: "number" }).notNull().unique(),
    login: text("login").notNull(),
    type: text("type").notNull().default("Organization"),
    avatarUrl: text("avatar_url"),
    installationId: bigint("installation_id", { mode: "number" }).unique(),
    installationSuspended: boolean("installation_suspended").notNull().default(false),
    /** GitHub user who installed the app here (the `installation.created` sender); may link it to a NEXORA organisation. */
    installerGithubId: bigint("installer_github_id", { mode: "number" }),
    plan: planEnum("plan").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    subscriptionStatus: text("subscription_status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** The NEXORA (Clerk) organisation this account is linked to; its Core plan then applies too. */
    nexoraOrgId: text("nexora_org_id"),
    nexoraOrgName: text("nexora_org_name"),
    ...timestamps,
  },
  (t) => [
    index("accounts_login_lower_idx").on(sql`lower(${t.login})`),
    index("accounts_nexora_org_idx").on(t.nexoraOrgId),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.accountId] }), index("memberships_account_idx").on(t.accountId)],
);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull().unique(),
    fullName: text("full_name").notNull(),
    private: boolean("private").notNull().default(false),
    /** User toggle in the dashboard. */
    enabled: boolean("enabled").notNull().default(true),
    /** False once the repo is removed from the installation; history is kept for usage accounting. */
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("repositories_account_idx").on(t.accountId)],
);

export type FindingCounts = { critical: number; major: number; minor: number; nit: number };

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Queue job that produced this row; retries of the same job update it instead of adding rows. */
    jobId: text("job_id").unique(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    prNumber: integer("pr_number").notNull(),
    prTitle: text("pr_title"),
    prAuthor: text("pr_author"),
    headSha: text("head_sha").notNull(),
    // The commit the incremental diff started from; null for a full review.
    baseSha: text("base_sha"),
    status: reviewStatusEnum("status").notNull().default("queued"),
    trigger: reviewTriggerEnum("trigger").notNull().default("auto"),
    skipReason: text("skip_reason"),
    filesReviewed: integer("files_reviewed").notNull().default(0),
    commentsPosted: integer("comments_posted").notNull().default(0),
    findingCounts: jsonb("finding_counts").$type<FindingCounts>(),
    summary: text("summary"),
    model: text("model"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    githubReviewId: bigint("github_review_id", { mode: "number" }),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("reviews_account_created_idx").on(t.accountId, t.createdAt),
    index("reviews_repo_pr_idx").on(t.repositoryId, t.prNumber),
  ],
);

/** GitHub retries deliveries; this table makes webhook handling idempotent. */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    event: text("event").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_deliveries_received_idx").on(t.receivedAt)],
);

/**
 * The plan NEXORA Core says an organisation has for CodeReviewer, pushed by Core's Stripe
 * webhook. Kept even before any account is linked, so a later link applies it at once.
 * `asOf` is the Stripe event time; an older update than the stored one is ignored.
 */
export const nexoraOrgPlans = pgTable("nexora_org_plans", {
  orgId: text("org_id").primaryKey(),
  plan: planEnum("plan").notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** A started link of an account to a NEXORA organisation, waiting for Console's grant. Single use. */
export const nexoraLinkRequests = pgTable(
  "nexora_link_requests",
  {
    // SHA-256 of the nonce held in the browser's cookie; the raw nonce is never stored.
    id: text("id").primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("nexora_link_requests_expires_idx").on(t.expiresAt)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Repository = typeof repositories.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Plan = (typeof planEnum.enumValues)[number];
