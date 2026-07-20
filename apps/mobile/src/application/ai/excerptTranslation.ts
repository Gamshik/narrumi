import { z } from 'zod';

// excerptTextLimit bounds the learner-selected source passed to the AI boundary.
export const excerptTextLimit: number = 500;
// excerptTranslationLimit rejects unexpectedly verbose model output.
export const excerptTranslationLimit: number = 1500;

// TranslateExcerptRequest is the bounded plain-data contract sent to the Edge Function.
export type TranslateExcerptRequest = {
  // selectedText is the exact learner-selected episode fragment.
  readonly selectedText: string;
};

// ExcerptTranslationPayload is the validated translation returned to the reader.
export type ExcerptTranslationPayload = {
  // translation is plain Russian text without teaching commentary.
  readonly translation: string;
};

// translateExcerptRequestSchema validates the bounded client request before transport.
export const translateExcerptRequestSchema: z.ZodType<TranslateExcerptRequest> =
  z.object({
    selectedText: z.string().trim().min(1).max(excerptTextLimit),
  });

// excerptTranslationPayloadSchema accepts only one plain Russian translation.
const excerptTranslationPayloadSchema: z.ZodType<ExcerptTranslationPayload> =
  z.object({
    translation: z.string().trim().min(1).max(excerptTranslationLimit),
  });

// parseExcerptTranslationPayload validates untrusted Edge Function output.
export function parseExcerptTranslationPayload(
  value: unknown,
): ExcerptTranslationPayload {
  return excerptTranslationPayloadSchema.parse(value);
}
