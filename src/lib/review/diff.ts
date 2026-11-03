export type DiffLine =
  | { kind: "context"; oldLine: number; newLine: number; text: string }
  | { kind: "add"; newLine: number; text: string }
  | { kind: "del"; oldLine: number; text: string };

export type Hunk = { header: string; lines: DiffLine[] };

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;

/** Parse the `patch` field GitHub returns for one file. */
export function parsePatch(patch: string): Hunk[] {
  const hunks: Hunk[] = [];
  let current: Hunk | undefined;
  let oldLine = 0;
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      current = { header: raw, lines: [] };
      hunks.push(current);
      continue;
    }
    if (!current || raw.startsWith("\\")) continue; // "\ No newline at end of file"

    const marker = raw[0];
    const text = raw.slice(1);
    if (marker === "+") {
      current.lines.push({ kind: "add", newLine: newLine++, text });
    } else if (marker === "-") {
      current.lines.push({ kind: "del", oldLine: oldLine++, text });
    } else {
      current.lines.push({ kind: "context", oldLine: oldLine++, newLine: newLine++, text });
    }
  }
  return hunks;
}

/** New-file line numbers GitHub accepts for RIGHT-side review comments. */
export function commentableLines(hunks: Hunk[]): Set<number> {
  const lines = new Set<number>();
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind !== "del") lines.add(line.newLine);
    }
  }
  return lines;
}

/** Lines of one hunk, needed to validate that a multi-line comment does not span hunks. */
export function hunkRanges(hunks: Hunk[]): Array<[number, number]> {
  return hunks
    .map((hunk) => {
      const numbers = hunk.lines.flatMap((l) => (l.kind === "del" ? [] : [l.newLine]));
      return numbers.length ? ([Math.min(...numbers), Math.max(...numbers)] as [number, number]) : null;
    })
    .filter((r): r is [number, number] => r !== null);
}

/**
 * Render hunks with explicit new-file line numbers so the model can cite exact
 * lines. Deleted lines carry no number because they cannot receive comments.
 */
export function renderAnnotatedHunks(hunks: Hunk[]): string {
  const width = Math.max(
    3,
    ...hunks.flatMap((h) => h.lines.map((l) => (l.kind === "del" ? 0 : String(l.newLine).length))),
  );
  const out: string[] = [];
  for (const hunk of hunks) {
    out.push(hunk.header);
    for (const line of hunk.lines) {
      if (line.kind === "del") out.push(`${" ".repeat(width)} - ${line.text}`);
      else if (line.kind === "add") out.push(`${String(line.newLine).padStart(width)} + ${line.text}`);
      else out.push(`${String(line.newLine).padStart(width)}   ${line.text}`);
    }
  }
  return out.join("\n");
}
