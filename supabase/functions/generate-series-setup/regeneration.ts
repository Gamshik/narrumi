// Pure helpers that detect whether full setup generation repeated the previous concept.
// They live outside index.ts so tests can import them without starting Deno.serve.

// RegenerationValues is the minimal setup shape compared before and after generation.
export interface RegenerationValues {
  readonly title?: string;
  readonly premise?: string;
  readonly userRole?: string;
  readonly mainCharacters: readonly string[];
}

// isRepeatedSetupConcept reports whether a generated setup is too similar to the previous one.
export function isRepeatedSetupConcept(
  previous: RegenerationValues,
  next: RegenerationValues,
): boolean {
  if (
    previous.title !== undefined &&
    next.title !== undefined &&
    sameText(previous.title, next.title) &&
    previous.mainCharacters.length > 0 &&
    next.mainCharacters.length > 0 &&
    sameNameSet(previous.mainCharacters, next.mainCharacters)
  ) {
    return true;
  }

  if (
    previous.mainCharacters.length > 0 &&
    next.mainCharacters.length > 0 &&
    sameNameSet(previous.mainCharacters, next.mainCharacters)
  ) {
    return true;
  }

  if (previous.premise !== undefined && next.premise !== undefined) {
    if (sameText(previous.premise, next.premise)) {
      return true;
    }

    return calculateJaccardOverlap(previous.premise, next.premise) >= 0.65;
  }

  return false;
}

// normalizeForComparison lowercases and collapses whitespace before text comparisons.
export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

// sameText compares two strings ignoring casing and surrounding or repeated whitespace.
export function sameText(a: string, b: string): boolean {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

// sameNameSet treats two character lists as equal when they contain the same names.
export function sameNameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = a.map(normalizeForComparison).sort();
  const right = b.map(normalizeForComparison).sort();

  return left.length === right.length && left.every((value, index) => value === right[index]);
}

// calculateJaccardOverlap estimates textual similarity by meaningful token overlap.
function calculateJaccardOverlap(a: string, b: string): number {
  const tokensA = new Set(
    normalizeForComparison(a)
      .split(' ')
      .filter((token) => token.length > 2),
  );
  const tokensB = new Set(
    normalizeForComparison(b)
      .split(' ')
      .filter((token) => token.length > 2),
  );

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;

  return intersection / union;
}
