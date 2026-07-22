import { logSafeInfo } from './http.ts';

// OptionalAiEnrichmentInput describes AI work that may be omitted without invalidating the main response.
export type OptionalAiEnrichmentInput<TResult> = {
  // stage identifies the skipped enrichment without exposing learner or model output.
  readonly stage: string;
  // generate performs the bounded enrichment attempts configured by the caller.
  readonly generate: () => Promise<TResult>;
  // fallback is the contract-safe value returned after enrichment exhaustion.
  readonly fallback: TResult;
};

// resolveOptionalAiEnrichment preserves valid primary content when non-critical AI enrichment fails.
export async function resolveOptionalAiEnrichment<TResult>({
  stage,
  generate,
  fallback,
}: OptionalAiEnrichmentInput<TResult>): Promise<TResult> {
  try {
    return await generate();
  } catch (error: unknown) {
    logSafeInfo('AI optional enrichment skipped', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      stage,
    });

    return fallback;
  }
}
