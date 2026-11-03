import { parse as parseYaml } from "yaml";
import { DEFAULT_CONFIG, PROFILES, reviewConfigSchema, type ReviewConfig } from "./schema";

export const CONFIG_PATHS = [".codereviewer.yaml", ".codereviewer.yml", ".github/codereviewer.yaml"] as const;
export const COMPAT_CONFIG_PATHS = [".coderabbit.yaml", ".coderabbit.yml"] as const;

export type ConfigSource = "default" | "codereviewer" | "coderabbit";

export type LoadedConfig = {
  config: ReviewConfig;
  source: ConfigSource;
  path?: string;
  /** Problems shown to the PR author. The review still runs with defaults for the bad fields. */
  errors: string[];
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** Parse a .codereviewer.yaml document. Invalid fields fall back to their defaults. */
export function parseConfig(text: string): { config: ReviewConfig; errors: string[] } {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    return { config: DEFAULT_CONFIG, errors: [`YAML syntax error: ${(error as Error).message.split("\n")[0]}`] };
  }
  if (raw == null) return { config: DEFAULT_CONFIG, errors: [] };
  const record = asRecord(raw);
  if (!record) return { config: DEFAULT_CONFIG, errors: ["Config must be a YAML mapping."] };
  return validate(record);
}

function validate(record: Record<string, unknown>): { config: ReviewConfig; errors: string[] } {
  const result = reviewConfigSchema.safeParse(record);
  if (result.success) return { config: result.data, errors: [] };

  const errors = result.error.issues.map((issue) => {
    const where = issue.path.length ? issue.path.join(".") : "(root)";
    return `${where}: ${issue.message}`;
  });

  // Drop every top-level key that has an issue and keep the rest, so one typo
  // does not throw away the whole file.
  const badKeys = new Set(
    result.error.issues.flatMap((issue) => {
      if (issue.path.length > 0) return [String(issue.path[0])];
      if (issue.code === "unrecognized_keys") return issue.keys;
      return [];
    }),
  );
  const cleaned = Object.fromEntries(Object.entries(record).filter(([key]) => !badKeys.has(key)));
  const retry = reviewConfigSchema.safeParse(cleaned);
  return { config: retry.success ? retry.data : DEFAULT_CONFIG, errors };
}

/**
 * Read the subset of a .coderabbit.yaml that maps onto CodeReviewer, so teams can
 * switch without rewriting their config. Fields with no equivalent are ignored.
 */
export function parseCodeRabbitConfig(text: string): { config: ReviewConfig; errors: string[] } {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    return { config: DEFAULT_CONFIG, errors: [`YAML syntax error: ${(error as Error).message.split("\n")[0]}`] };
  }
  const root = asRecord(raw) ?? {};
  const reviews = asRecord(root.reviews) ?? {};
  const auto = asRecord(reviews.auto_review) ?? {};

  const mapped: Record<string, unknown> = {};
  if (typeof root.language === "string") mapped.language = root.language;
  if (typeof root.tone_instructions === "string") mapped.instructions = root.tone_instructions;
  if (typeof reviews.profile === "string" && (PROFILES as readonly string[]).includes(reviews.profile)) {
    mapped.profile = reviews.profile;
  }
  if (typeof reviews.request_changes_workflow === "boolean") mapped.request_changes = reviews.request_changes_workflow;
  if (typeof reviews.high_level_summary === "boolean") mapped.summary = reviews.high_level_summary;
  if (typeof reviews.changed_files_summary === "boolean") mapped.walkthrough = reviews.changed_files_summary;
  if (Array.isArray(reviews.path_filters)) mapped.path_filters = reviews.path_filters;
  if (Array.isArray(reviews.path_instructions)) {
    mapped.path_instructions = reviews.path_instructions
      .map(asRecord)
      .filter((p): p is Record<string, unknown> => Boolean(p))
      .map((p) => ({ path: p.path, instructions: p.instructions }));
  }

  const autoReview: Record<string, unknown> = {};
  if (typeof auto.enabled === "boolean") autoReview.enabled = auto.enabled;
  if (typeof auto.drafts === "boolean") autoReview.drafts = auto.drafts;
  if (typeof auto.auto_incremental_review === "boolean") autoReview.incremental = auto.auto_incremental_review;
  if (Array.isArray(auto.base_branches)) autoReview.base_branches = auto.base_branches;
  if (Array.isArray(auto.ignore_title_keywords)) autoReview.ignore_title_keywords = auto.ignore_title_keywords;
  if (Array.isArray(auto.ignore_usernames)) autoReview.ignore_authors = auto.ignore_usernames;
  if (Object.keys(autoReview).length) mapped.auto_review = autoReview;

  return validate(mapped);
}

/** Fetches a file from the PR head; returns null when the file does not exist. */
export type FileReader = (path: string) => Promise<string | null>;

export async function loadRepoConfig(read: FileReader): Promise<LoadedConfig> {
  for (const path of CONFIG_PATHS) {
    const text = await read(path);
    if (text != null) return { ...parseConfig(text), source: "codereviewer", path };
  }
  for (const path of COMPAT_CONFIG_PATHS) {
    const text = await read(path);
    if (text != null) return { ...parseCodeRabbitConfig(text), source: "coderabbit", path };
  }
  return { config: DEFAULT_CONFIG, source: "default", errors: [] };
}
