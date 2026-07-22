import { z } from 'npm:zod@4.4.3';

// LATIN_LETTER_PATTERN counts letters compatible with English learner-facing text.
const LATIN_LETTER_PATTERN = /\p{Script=Latin}/gu;

// LETTER_PATTERN counts all alphabetic characters regardless of script.
const LETTER_PATTERN = /\p{L}/gu;

// CYRILLIC_LETTER_PATTERN identifies the required script for Russian translations.
const CYRILLIC_LETTER_PATTERN = /\p{Script=Cyrillic}/u;

// MINIMUM_LATIN_RATIO permits isolated non-Latin proper names but rejects translated prose.
const MINIMUM_LATIN_RATIO = 0.7;

// GeneratedTextField identifies one AI-written field without exposing its value in errors.
export type GeneratedTextField = {
  // fieldName is the safe contract label used in validation errors.
  readonly fieldName: string;
  // value is absent when an optional generated field was omitted.
  readonly value?: string;
};

// isPredominantlyEnglishText verifies that generated prose uses primarily Latin script.
export function isPredominantlyEnglishText(value: string): boolean {
  // letterCount excludes punctuation and numbers from the language decision.
  const letterCount: number = value.match(LETTER_PATTERN)?.length ?? 0;

  if (letterCount === 0) {
    return true;
  }

  // latinLetterCount permits ordinary English diacritics while rejecting Cyrillic prose.
  const latinLetterCount: number = value.match(LATIN_LETTER_PATTERN)?.length ??
    0;

  return latinLetterCount / letterCount >= MINIMUM_LATIN_RATIO;
}

// createEnglishGeneratedTextSchema creates one bounded learner-facing English contract.
export function createEnglishGeneratedTextSchema(
  maxLength: number,
): z.ZodType<string, string> {
  return z.string().trim().min(1).max(maxLength).refine(
    isPredominantlyEnglishText,
    'Generated learner-facing text must be predominantly English.',
  );
}

// createRussianTranslationSchema creates a bounded annotation translation contract.
export function createRussianTranslationSchema(
  maxLength: number,
): z.ZodType<string, string> {
  return z.string().trim().min(1).max(maxLength).refine(
    (value) => CYRILLIC_LETTER_PATTERN.test(value),
    'Annotation translation must contain Russian Cyrillic.',
  );
}

// assertEnglishGeneratedTextFields is the final defense before AI text reaches storage.
export function assertEnglishGeneratedTextFields(
  label: string,
  fields: readonly GeneratedTextField[],
): void {
  const invalidField = fields.find((field) =>
    field.value !== undefined && !isPredominantlyEnglishText(field.value)
  );

  if (invalidField) {
    throw new Error(
      `${label} field ${invalidField.fieldName} must be predominantly English.`,
    );
  }
}
