import type {
  ExcerptTranslationPayload,
  TranslateExcerptRequest,
} from '@application/ai/excerptTranslation';

// ExcerptTranslationGateway hides the translate-excerpt Edge Function transport.
export type ExcerptTranslationGateway = {
  // translateExcerpt returns one validated Russian translation for selected episode text.
  readonly translateExcerpt: (
    request: TranslateExcerptRequest,
  ) => Promise<ExcerptTranslationPayload>;
};
