import { z } from 'npm:zod';

// SELECTED_EXCERPT_LIMIT bounds the source fragment accepted by the server.
export const SELECTED_EXCERPT_LIMIT: number = 500;
// EXCERPT_TRANSLATION_LIMIT rejects verbose or malformed model output.
export const EXCERPT_TRANSLATION_LIMIT: number = 1500;

// TranslateExcerptRequest is the only input accepted by the translation boundary.
export type TranslateExcerptRequest = {
  // selectedText is the exact English episode fragment to translate.
  readonly selectedText: string;
};

// ExcerptTranslationPayload is the single-field response returned to mobile.
export type ExcerptTranslationPayload = {
  // translation is natural Russian text without commentary.
  readonly translation: string;
};

// translateExcerptRequestSchema validates untrusted mobile input.
export const translateExcerptRequestSchema: z.ZodType<TranslateExcerptRequest> =
  z.object({
    selectedText: z.string().trim().min(1).max(SELECTED_EXCERPT_LIMIT),
  }).strict();

// excerptTranslationPayloadSchema validates the model response before exposure.
export const excerptTranslationPayloadSchema: z.ZodType<ExcerptTranslationPayload> =
  z.object({
    translation: z.string().trim().min(1).max(EXCERPT_TRANSLATION_LIMIT),
  });
