import { z } from "zod";

export const PROFILES = ["quiet", "chill", "assertive"] as const;
export type Profile = (typeof PROFILES)[number];

export const pathInstructionSchema = z.object({
  path: z.string().min(1).describe("Glob matched against file paths, e.g. src/api/**"),
  instructions: z.string().min(1).max(4000).describe("Review guidance for matching files"),
});

export const autoReviewSchema = z
  .object({
    enabled: z.boolean().default(true).describe("Review automatically when a pull request is opened or updated"),
    drafts: z.boolean().default(false).describe("Also review draft pull requests"),
    incremental: z.boolean().default(true).describe("Review only the commits pushed since the last review"),
    base_branches: z
      .array(z.string())
      .default([])
      .describe("Globs for base branches to review. Empty means every branch"),
    ignore_title_keywords: z
      .array(z.string())
      .default(["WIP", "DO NOT REVIEW", "[skip review]"])
      .describe("Skip pull requests whose title contains any of these (case-insensitive)"),
    ignore_authors: z
      .array(z.string())
      .default(["dependabot[bot]", "renovate[bot]"])
      .describe("Skip pull requests opened by these GitHub users"),
  })
  .strict();

export const reviewConfigSchema = z
  .object({
    language: z.string().min(2).max(35).default("en-US").describe("Language for review comments, e.g. en-US or pl-PL"),
    profile: z
      .enum(PROFILES)
      .default("chill")
      .describe("quiet: critical and major only. chill: adds minor. assertive: adds nits"),
    instructions: z.string().max(4000).default("").describe("Team-wide guidance included in every review"),
    auto_review: autoReviewSchema.default(() => autoReviewSchema.parse({})),
    request_changes: z
      .boolean()
      .default(false)
      .describe("Request changes and fail the check when a critical or major finding is posted"),
    summary: z.boolean().default(true).describe("Post a high-level summary in the review body"),
    walkthrough: z.boolean().default(true).describe("Add a per-file walkthrough table to the review body"),
    max_comments: z.number().int().min(0).max(100).default(25).describe("Maximum inline comments per review"),
    path_filters: z
      .array(z.string())
      .default([])
      .describe('Globs to include; prefix with "!" to exclude. Built-in exclusions always apply'),
    path_instructions: z.array(pathInstructionSchema).default([]).describe("Extra review rules for matching paths"),
  })
  .strict();

export type ReviewConfig = z.infer<typeof reviewConfigSchema>;
export type PathInstruction = z.infer<typeof pathInstructionSchema>;

export const DEFAULT_CONFIG: ReviewConfig = reviewConfigSchema.parse({});

/** Files that inflate diffs without carrying reviewable logic. */
export const BUILT_IN_EXCLUDES = [
  "**/*.lock",
  "**/package-lock.json",
  "**/pnpm-lock.yaml",
  "**/yarn.lock",
  "**/bun.lockb",
  "**/Cargo.lock",
  "**/go.sum",
  "**/poetry.lock",
  "**/composer.lock",
  "**/Gemfile.lock",
  "**/*.min.js",
  "**/*.min.css",
  "**/*.map",
  "**/node_modules/**",
  "**/vendor/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/*.snap",
  "**/*.pb.go",
  "**/*_generated.*",
  "**/*.generated.*",
  "**/*.{png,jpg,jpeg,gif,webp,ico,svg,pdf,zip,gz,tar,woff,woff2,ttf,eot,mp4,mp3,wasm}",
];
