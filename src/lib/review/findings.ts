import type { Profile } from "@/lib/config/schema";
import type { FindingCounts } from "@/db/schema";
import type { ReviewableFile } from "./files";
import { SEVERITIES, type Finding, type Severity } from "./prompt";

export type AnchoredFinding = Finding & { anchored: true };
export type UnanchoredFinding = Finding & { anchored: false };
export type CheckedFinding = AnchoredFinding | UnanchoredFinding;

const PROFILE_SEVERITIES: Record<Profile, Severity[]> = {
  quiet: ["critical", "major"],
  chill: ["critical", "major", "minor"],
  assertive: ["critical", "major", "minor", "nit"],
};

const rank = (s: Severity) => SEVERITIES.indexOf(s);

/** Check that a finding points at a line GitHub will accept; otherwise keep it for the review body. */
export function anchorFinding(finding: Finding, files: Map<string, ReviewableFile>): CheckedFinding {
  const file = files.get(finding.path);
  if (!file || !file.commentable.has(finding.line)) {
    return { ...finding, start_line: null, suggestion: null, anchored: false };
  }
  let start = finding.start_line;
  if (start !== null) {
    const first = start;
    const sameHunk = file.hunks.some(([lo, hi]) => first >= lo && finding.line <= hi);
    if (first >= finding.line || !file.commentable.has(first) || !sameHunk) start = null;
  }
  // A suggestion replaces exactly the commented range; without a valid range it would corrupt the file.
  const suggestion = finding.start_line !== null && start === null ? null : finding.suggestion;
  return { ...finding, start_line: start, suggestion, anchored: true };
}

export type ProcessedFindings = {
  comments: AnchoredFinding[];
  bodyOnly: CheckedFinding[];
  counts: FindingCounts;
};

export function processFindings(
  findings: Finding[],
  files: ReviewableFile[],
  options: { profile: Profile; maxComments: number },
): ProcessedFindings {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const allowed = new Set(PROFILE_SEVERITIES[options.profile]);
  const seen = new Set<string>();

  const kept = findings
    .filter((f) => allowed.has(f.severity))
    .filter((f) => {
      const key = `${f.path}:${f.line}:${f.title.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((f) => anchorFinding(f, byPath))
    .sort((a, b) => rank(a.severity) - rank(b.severity) || a.path.localeCompare(b.path) || a.line - b.line);

  const counts: FindingCounts = { critical: 0, major: 0, minor: 0, nit: 0 };
  for (const f of kept) counts[f.severity]++;

  const comments: AnchoredFinding[] = [];
  const bodyOnly: CheckedFinding[] = [];
  for (const f of kept) {
    if (f.anchored && comments.length < options.maxComments) comments.push(f);
    else bodyOnly.push(f);
  }
  return { comments, bodyOnly, counts };
}
