import type { ReviewConfig } from "@/lib/config/schema";
import { createPathFilter, instructionsFor } from "@/lib/config/paths";
import type { ChangedFile } from "@/lib/github/port";
import { commentableLines, hunkRanges, parsePatch, renderAnnotatedHunks } from "./diff";

export type ReviewableFile = {
  path: string;
  status: ChangedFile["status"];
  previousPath?: string;
  additions: number;
  deletions: number;
  annotatedDiff: string;
  commentable: Set<number>;
  hunks: Array<[number, number]>;
  instructions: string[];
};

export type SkippedFile = { path: string; reason: "filtered" | "removed" | "binary-or-too-large" | "over-limit" };

export type FileSelection = { files: ReviewableFile[]; skipped: SkippedFile[] };

export type SelectionLimits = {
  maxFiles: number;
  /** Total characters of annotated diff sent to the model for one review. */
  maxChars: number;
  /** A single file's annotated diff above this is skipped rather than truncated. */
  maxFileChars: number;
};

export const DEFAULT_LIMITS: SelectionLimits = { maxFiles: 150, maxChars: 400_000, maxFileChars: 100_000 };

export function selectFiles(changed: ChangedFile[], config: ReviewConfig, limits: SelectionLimits): FileSelection {
  const include = createPathFilter(config.path_filters);
  const files: ReviewableFile[] = [];
  const skipped: SkippedFile[] = [];
  let totalChars = 0;

  for (const file of changed) {
    if (!include(file.path)) {
      skipped.push({ path: file.path, reason: "filtered" });
      continue;
    }
    if (file.status === "removed") {
      skipped.push({ path: file.path, reason: "removed" });
      continue;
    }
    if (!file.patch) {
      // Pure renames have no patch and nothing to review.
      if (file.status !== "renamed") skipped.push({ path: file.path, reason: "binary-or-too-large" });
      continue;
    }

    const hunks = parsePatch(file.patch);
    const annotatedDiff = renderAnnotatedHunks(hunks);
    if (annotatedDiff.length > limits.maxFileChars) {
      skipped.push({ path: file.path, reason: "binary-or-too-large" });
      continue;
    }
    if (files.length >= limits.maxFiles || totalChars + annotatedDiff.length > limits.maxChars) {
      skipped.push({ path: file.path, reason: "over-limit" });
      continue;
    }

    totalChars += annotatedDiff.length;
    files.push({
      path: file.path,
      status: file.status,
      previousPath: file.previousPath,
      additions: file.additions,
      deletions: file.deletions,
      annotatedDiff,
      commentable: commentableLines(hunks),
      hunks: hunkRanges(hunks),
      instructions: instructionsFor(file.path, config.path_instructions),
    });
  }
  return { files, skipped };
}

/** Split files into model requests of roughly `maxChars` each, keeping each file whole. */
export function batchFiles(files: ReviewableFile[], maxChars = 120_000): ReviewableFile[][] {
  const batches: ReviewableFile[][] = [];
  let current: ReviewableFile[] = [];
  let size = 0;
  for (const file of files) {
    if (current.length && size + file.annotatedDiff.length > maxChars) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(file);
    size += file.annotatedDiff.length;
  }
  if (current.length) batches.push(current);
  return batches;
}
