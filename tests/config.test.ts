import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadRepoConfig, parseCodeRabbitConfig, parseConfig } from "@/lib/config/load";
import { createPathFilter, instructionsFor, matchesAny } from "@/lib/config/paths";
import { DEFAULT_CONFIG } from "@/lib/config/schema";

describe("parseConfig", () => {
  it("returns defaults for an empty document", () => {
    expect(parseConfig("")).toEqual({ config: DEFAULT_CONFIG, errors: [] });
  });

  it("parses a full config", () => {
    const { config, errors } = parseConfig(`
language: pl-PL
profile: assertive
instructions: Prefer early returns.
request_changes: true
max_comments: 10
auto_review:
  drafts: true
  base_branches: ["main", "release/*"]
path_filters: ["src/**", "!src/generated/**"]
path_instructions:
  - path: "src/api/**"
    instructions: Check authorization on every handler.
`);
    expect(errors).toEqual([]);
    expect(config.language).toBe("pl-PL");
    expect(config.profile).toBe("assertive");
    expect(config.request_changes).toBe(true);
    expect(config.auto_review.drafts).toBe(true);
    expect(config.auto_review.enabled).toBe(true);
    expect(config.auto_review.base_branches).toEqual(["main", "release/*"]);
    expect(config.path_instructions).toHaveLength(1);
  });

  it("keeps valid fields when one field is invalid", () => {
    const { config, errors } = parseConfig(`profile: balanced\nlanguage: de-DE\nmax_coments: 3`);
    expect(config.profile).toBe("chill");
    expect(config.language).toBe("de-DE");
    expect(errors.some((e) => e.includes("profile"))).toBe(true);
    expect(errors.some((e) => e.includes("max_coments"))).toBe(true);
  });

  it("reports YAML syntax errors", () => {
    const { config, errors } = parseConfig("profile: [unclosed");
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(errors[0]).toMatch(/YAML syntax error/);
  });

  it("rejects a non-mapping document", () => {
    expect(parseConfig("- a\n- b").errors).toEqual(["Config must be a YAML mapping."]);
  });
});

describe("parseCodeRabbitConfig", () => {
  const dirs = readdirSync("examples/coderabbit", { withFileTypes: true }).filter((d) => d.isDirectory());

  it.each(dirs.map((d) => d.name))("maps examples/coderabbit/%s/.coderabbit.yaml without errors", (name) => {
    const { config, errors } = parseCodeRabbitConfig(
      readFileSync(`examples/coderabbit/${name}/.coderabbit.yaml`, "utf8"),
    );
    expect(errors).toEqual([]);
    expect(config.language).toBe("en-US");
    expect(config.path_filters.length).toBeGreaterThan(0);
  });

  it("maps review settings", () => {
    const { config } = parseCodeRabbitConfig(`
reviews:
  profile: assertive
  request_changes_workflow: true
  auto_review:
    enabled: false
    ignore_usernames: ["bot"]
  path_instructions:
    - path: "**/*.ts"
      instructions: Strict types.
`);
    expect(config.profile).toBe("assertive");
    expect(config.request_changes).toBe(true);
    expect(config.auto_review.enabled).toBe(false);
    expect(config.auto_review.ignore_authors).toEqual(["bot"]);
    expect(config.path_instructions[0]?.instructions).toBe("Strict types.");
  });
});

describe("loadRepoConfig", () => {
  it("prefers .codereviewer.yaml over .coderabbit.yaml", async () => {
    const files: Record<string, string> = {
      ".codereviewer.yaml": "profile: quiet",
      ".coderabbit.yaml": "reviews:\n  profile: assertive",
    };
    const loaded = await loadRepoConfig(async (p) => files[p] ?? null);
    expect(loaded.source).toBe("codereviewer");
    expect(loaded.config.profile).toBe("quiet");
  });

  it("falls back to .coderabbit.yaml, then defaults", async () => {
    const compat = await loadRepoConfig(async (p) =>
      p === ".coderabbit.yaml" ? "reviews:\n  profile: assertive" : null,
    );
    expect(compat.source).toBe("coderabbit");
    expect(compat.config.profile).toBe("assertive");
    const none = await loadRepoConfig(async () => null);
    expect(none).toEqual({ config: DEFAULT_CONFIG, source: "default", errors: [] });
  });
});

describe("path filters", () => {
  it("applies built-in exclusions", () => {
    const filter = createPathFilter([]);
    expect(filter("src/index.ts")).toBe(true);
    expect(filter("package-lock.json")).toBe(false);
    expect(filter("web/dist/app.js")).toBe(false);
    expect(filter("assets/logo.png")).toBe(false);
    expect(filter(".github/workflows/ci.yml")).toBe(true);
  });

  it("honours includes and excludes", () => {
    const filter = createPathFilter(["src/**", "!src/legacy/**"]);
    expect(filter("src/a.ts")).toBe(true);
    expect(filter("src/legacy/b.ts")).toBe(false);
    expect(filter("scripts/c.ts")).toBe(false);
  });

  it("collects matching path instructions", () => {
    const rules = [
      { path: "src/**", instructions: "A" },
      { path: "**/*.test.ts", instructions: "B" },
    ];
    expect(instructionsFor("src/x.test.ts", rules)).toEqual(["A", "B"]);
    expect(instructionsFor("lib/x.ts", rules)).toEqual([]);
  });

  it("matches branch patterns", () => {
    expect(matchesAny("release/1.2", ["main", "release/*"])).toBe(true);
    expect(matchesAny("feature/x", ["main"])).toBe(false);
    expect(matchesAny("main", [])).toBe(false);
  });
});

describe("shipped examples and schema", () => {
  it.each(["examples/.codereviewer.yaml", ".codereviewer.yaml"])("%s is valid", (path) => {
    expect(parseConfig(readFileSync(path, "utf8")).errors).toEqual([]);
  });

  it("schema/codereviewer.schema.json is up to date", async () => {
    const { configJsonSchema } = await import("@/lib/config/json-schema");
    const committed = JSON.parse(readFileSync("schema/codereviewer.schema.json", "utf8"));
    expect(committed).toEqual(configJsonSchema());
  });
});
