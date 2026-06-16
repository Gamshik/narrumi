// Pure helpers that guarantee single-field regeneration actually changes a value.
// They live in their own module so the behavior can be unit tested without starting
// the Edge runtime (index.ts runs Deno.serve on import).

// RegenerableField names the AI-fillable text fields eligible for individual regeneration.
export type RegenerableField = 'premise' | 'mainCharacters' | 'userRole' | 'title';

// RegenerationValues is the minimal text shape compared before and after regeneration.
export interface RegenerationValues {
  readonly title?: string;
  readonly premise?: string;
  readonly userRole?: string;
  readonly mainCharacters: readonly string[];
}

// RegenerationCheck describes which field was regenerated, plus its previous and new values.
export interface RegenerationCheck {
  readonly field: RegenerableField | undefined;
  readonly previous: RegenerationValues;
  readonly next: RegenerationValues;
}

// isRepeatedRegeneration reports whether a single-field regeneration returned the same
// value as before. It only applies when the field already had a value, so it never
// blocks the first time an empty field is filled, and it ignores casing, spacing, and
// character order so a reworded or reshuffled repeat still counts as unchanged.
export function isRepeatedRegeneration({ field, previous, next }: RegenerationCheck): boolean {
  switch (field) {
    case 'title':
      return previous.title !== undefined && sameText(next.title ?? '', previous.title);
    case 'premise':
      return previous.premise !== undefined && sameText(next.premise ?? '', previous.premise);
    case 'userRole':
      return (
        previous.userRole !== undefined &&
        next.userRole !== undefined &&
        sameText(next.userRole, previous.userRole)
      );
    case 'mainCharacters':
      return (
        previous.mainCharacters.length > 0 &&
        sameNameSet(next.mainCharacters, previous.mainCharacters)
      );
    default:
      return false;
  }
}

// normalizeForComparison lowercases and collapses whitespace so values that differ
// only in casing or spacing still count as the same when checking for repeats.
export function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

// sameText compares two strings ignoring casing and surrounding or repeated whitespace.
export function sameText(a: string, b: string): boolean {
  return normalizeForComparison(a) === normalizeForComparison(b);
}

// sameNameSet treats two character lists as equal when they contain the same names,
// regardless of order, so simply reshuffling the previous cast counts as unchanged.
export function sameNameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = a.map(normalizeForComparison).sort();
  const right = b.map(normalizeForComparison).sort();

  return left.length === right.length && left.every((value, index) => value === right[index]);
}
