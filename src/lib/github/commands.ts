export type Command = { kind: "review"; full: boolean } | { kind: "help" } | { kind: "unknown"; text: string };

/** Finds the first `@slug <command>` mention in a comment. Returns null when the bot is not mentioned. */
export function parseCommand(body: string, slug: string): Command | null {
  const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\s)@${escaped}(?:\\[bot\\])?(?![\\w-])[ \\t]*([^\\n]*)`, "i").exec(body);
  if (!match) return null;
  const text = (match[1] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (text === "" || text === "review") return { kind: "review", full: false };
  if (text === "full review" || text === "review full") return { kind: "review", full: true };
  if (text === "help") return { kind: "help" };
  return { kind: "unknown", text };
}

/** Only people with a stake in the repo can spend the account's review quota. */
export const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function helpText(slug: string, appUrl: string): string {
  return [
    "**CodeReviewer commands**",
    "",
    "| Command | What it does |",
    "| --- | --- |",
    `| \`@${slug} review\` | Review the commits pushed since the last review |`,
    `| \`@${slug} full review\` | Review the whole pull request again |`,
    `| \`@${slug} help\` | Show this message |`,
    "",
    `Configure reviews with a \`.codereviewer.yaml\` file. [Configuration reference](${appUrl}/docs#configuration)`,
  ].join("\n");
}
