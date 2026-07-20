import {
  excerptTextLimit,
  translateExcerptRequestSchema,
  type ExcerptTranslationPayload,
  type TranslateExcerptRequest,
} from '@application/ai/excerptTranslation';
import type {
  ExcerptTranslationGateway,
  NetworkStatus,
} from '@application/ports';

// TranslateEpisodeExcerptInput contains only the exact selected prose.
export type TranslateEpisodeExcerptInput = TranslateExcerptRequest;

// TranslateEpisodeExcerptResult exposes the validated plain translation to presentation.
export type TranslateEpisodeExcerptResult = ExcerptTranslationPayload;

// TranslateEpisodeExcerpt coordinates connectivity and the secure AI gateway.
export type TranslateEpisodeExcerpt = {
  // execute translates selected episode prose without exposing transport details.
  readonly execute: (
    input: TranslateEpisodeExcerptInput,
  ) => Promise<TranslateEpisodeExcerptResult>;
};

// createTranslateEpisodeExcerpt injects connectivity and the secure translation boundary.
export function createTranslateEpisodeExcerpt(
  networkStatus: NetworkStatus,
  gateway: ExcerptTranslationGateway,
): TranslateEpisodeExcerpt {
  return {
    execute: async (
      input: TranslateEpisodeExcerptInput,
    ): Promise<TranslateEpisodeExcerptResult> => {
      if (input.selectedText.trim().length > excerptTextLimit) {
        throw new Error(
          `Select a shorter passage of up to ${excerptTextLimit} characters.`,
        );
      }

      // parsedInput prevents oversized or empty text from crossing the AI boundary.
      const parsedInput: TranslateExcerptRequest =
        translateExcerptRequestSchema.parse(input);

      try {
        // The request runs before connectivity diagnosis so stale iOS reachability cannot block it.
        return await gateway.translateExcerpt(parsedInput);
      } catch (error: unknown) {
        // isOnline records only a successful post-failure reachability diagnosis.
        let isOnline: boolean;

        try {
          const connectivity = await networkStatus.getCurrentState();
          isOnline = connectivity.isOnline;
        } catch {
          // A reachability lookup failure must not replace the real gateway error.
          throw error;
        }

        if (!isOnline) {
          throw new Error(
            'Selected-text translation is available only when online.',
          );
        }

        throw error;
      }
    },
  };
}
