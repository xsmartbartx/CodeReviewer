import picomatch from "picomatch";
import { BUILT_IN_EXCLUDES, type PathInstruction } from "./schema";

const options = { dot: true } as const;

function compile(patterns: string[]) {
  return patterns.length ? picomatch(patterns, options) : () => false;
}

export type PathFilter = (path: string) => boolean;

/**
 * Build a predicate from path_filters. Patterns starting with "!" exclude. When any
 * include pattern exists, a path must match one of them.
 */
export function createPathFilter(filters: string[]): PathFilter {
  const includes = filters.filter((p) => !p.startsWith("!"));
  const excludes = filters.filter((p) => p.startsWith("!")).map((p) => p.slice(1));
  const isIncluded = includes.length ? picomatch(includes, options) : () => true;
  const isExcluded = compile([...BUILT_IN_EXCLUDES, ...excludes]);
  return (path) => isIncluded(path) && !isExcluded(path);
}

/** Instructions whose glob matches the path, in config order. */
export function instructionsFor(path: string, pathInstructions: PathInstruction[]): string[] {
  return pathInstructions.filter((p) => picomatch.isMatch(path, p.path, options)).map((p) => p.instructions);
}

export function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.length > 0 && picomatch.isMatch(value, patterns, options);
}
