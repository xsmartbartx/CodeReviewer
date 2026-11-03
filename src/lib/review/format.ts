import type { FindingCounts } from "@/db/schema";
import type { CheckedFinding } from "./findings";
import type { SkippedFile } from "./files";
import type { Severity } from "./prompt";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "🔴 Critical",
  major: "🟠 Major",
  minor: "🟡 Minor",
  nit: "⚪ Nit",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Longest run of backticks in the text plus one, so a suggestion containing ``` still renders. */
function fenceFor(text: string): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  return "`".repeat(longest + 1);
}

export function commentBody(finding: CheckedFinding): string {
  const parts = [
    `**${SEVERITY_LABEL[finding.severity]} · ${capitalize(finding.category)}:** ${finding.title}`,
    "",
    finding.body.trim(),
  ];
  if (finding.anchored && finding.suggestion !== null) {
    const fence = fenceFor(finding.suggestion);
    parts.push("", `${fence}suggestion`, finding.suggestion.replace(/\n$/, ""), fence);
  }
  return parts.join("\n");
}

export function countsLine(counts: FindingCounts): string {
  const total = counts.critical + counts.major + counts.minor + counts.nit;
  if (total === 0) return "No issues found. ✅";
  return [
    counts.critical && `🔴 ${counts.critical} critical`,
    counts.major && `🟠 ${counts.major} major`,
    counts.minor && `🟡 ${counts.minor} minor`,
    counts.nit && `⚪ ${counts.nit} nit${counts.nit === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const SKIP_REASON: Record<SkippedFile["reason"], string> = {
  filtered: "excluded by path filters",
  removed: "deleted",
  "binary-or-too-large": "binary or too large to review",
  "over-limit": "over the per-review size limit",
};

function escapeCell(text: string) {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export type ReviewBodyInput = {
  summary: string | null;
  showSummary: boolean;
  walkthrough: Array<{ path: string; summary: string }> | null;
  counts: FindingCounts;
  bodyOnly: CheckedFinding[];
  skipped: SkippedFile[];
  configNotice: string | null;
  failedParts: string[];
  range: { from: string | null; to: string };
  slug: string;
};

export function reviewBody(input: ReviewBodyInput): string {
  const out: string[] = ["## CodeReviewer"];

  if (input.showSummary && input.summary) out.push("", input.summary.trim());
  out.push("", `**Findings:** ${countsLine(input.counts)}`);

  if (input.walkthrough?.length) {
    out.push(
      "",
      `<details>\n<summary>Walkthrough (${input.walkthrough.length} file${input.walkthrough.length === 1 ? "" : "s"})</summary>\n`,
      "| File | Change |",
      "| --- | --- |",
      ...input.walkthrough.map((f) => `| \`${escapeCell(f.path)}\` | ${escapeCell(f.summary)} |`),
      "\n</details>",
    );
  }

  if (input.bodyOnly.length) {
    out.push(
      "",
      `<details>\n<summary>Findings not posted inline (${input.bodyOnly.length})</summary>\n`,
      ...input.bodyOnly.map(
        (f) =>
          `- **${SEVERITY_LABEL[f.severity]}** \`${f.path}:${f.line}\`: ${f.title}\n  ${f.body.trim().replace(/\n/g, "\n  ")}`,
      ),
      "\n</details>",
    );
  }

  const notReviewed = input.skipped.filter((s) => s.reason !== "filtered" && s.reason !== "removed");
  if (notReviewed.length) {
    out.push(
      "",
      `<details>\n<summary>Files not reviewed (${notReviewed.length})</summary>\n`,
      ...notReviewed.map((s) => `- \`${s.path}\`: ${SKIP_REASON[s.reason]}`),
      "\n</details>",
    );
  }

  if (input.failedParts.length) {
    out.push("", `> [!WARNING]\n> Part of this review could not be completed: ${input.failedParts.join(" ")}`);
  }
  if (input.configNotice) out.push("", `> [!NOTE]\n> ${input.configNotice}`);

  const range = input.range.from
    ? `Reviewed commits \`${input.range.from.slice(0, 7)}..${input.range.to.slice(0, 7)}\``
    : `Reviewed up to \`${input.range.to.slice(0, 7)}\``;
  out.push("", `<sub>${range} · Comment \`@${input.slug} help\` for commands</sub>`);
  return out.join("\n");
}
