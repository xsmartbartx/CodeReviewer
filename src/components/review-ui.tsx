import type { FindingCounts, Review } from "@/db/schema";
import { Badge } from "./ui";

export function StatusBadge({ review }: { review: Pick<Review, "status" | "skipReason"> }) {
  switch (review.status) {
    case "completed":
      return <Badge tone="green">Reviewed</Badge>;
    case "running":
    case "queued":
      return <Badge tone="brand">Running</Badge>;
    case "failed":
      return <Badge tone="red">Failed</Badge>;
    case "skipped":
      return (
        <Badge tone={review.skipReason === "quota" ? "amber" : "neutral"}>
          {review.skipReason === "quota" ? "Over quota" : "Skipped"}
        </Badge>
      );
  }
}

export function FindingSummary({ counts }: { counts: FindingCounts | null }) {
  if (!counts) return <span className="text-zinc-400">-</span>;
  const total = counts.critical + counts.major + counts.minor + counts.nit;
  if (total === 0) return <span className="text-emerald-600 dark:text-emerald-400">Clean</span>;
  return (
    <span className="flex flex-wrap gap-1.5 text-xs tabular-nums">
      {counts.critical > 0 && <Badge tone="red">{counts.critical} critical</Badge>}
      {counts.major > 0 && <Badge tone="amber">{counts.major} major</Badge>}
      {counts.minor > 0 && <Badge>{counts.minor} minor</Badge>}
      {counts.nit > 0 && <Badge>{counts.nit} nit</Badge>}
    </span>
  );
}

export function timeAgo(date: Date, now = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: Array<[number, string]> = [
    [60 * 60 * 24 * 30, "month"],
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  for (const [size, unit] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}
