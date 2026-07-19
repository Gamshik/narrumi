import type {
  Clock,
  GenerationRequestStore,
  NetworkStatus,
  SeriesSetupDraft,
  SeriesSetupDraftGateway,
  GenerateSeriesSetupDraftRequest,
} from '@application/ports';
import {
  createGenerationOperationKey,
  createGenerationRequestId,
} from '@application/ai/generationRequest';

// GenerateSeriesSetupDraftInput mirrors the editable setup form before local persistence.
export type GenerateSeriesSetupDraftInput = Omit<
  GenerateSeriesSetupDraftRequest,
  'generationRequestId'
>;

// GenerateSeriesSetupDraftResult returns complete text fields for the setup form.
export type GenerateSeriesSetupDraftResult = {
  // draft contains generated missing text fields while preserving selected options.
  readonly draft: SeriesSetupDraft;
};

// GenerateSeriesSetupDraft fills missing series setup text through the AI boundary.
export type GenerateSeriesSetupDraft = {
  // execute calls the online setup generator and returns a complete draft.
  readonly execute: (
    input: GenerateSeriesSetupDraftInput,
  ) => Promise<GenerateSeriesSetupDraftResult>;
};

// createGenerateSeriesSetupDraft injects connectivity and AI gateway dependencies.
export function createGenerateSeriesSetupDraft(
  networkStatus: NetworkStatus,
  gateway: SeriesSetupDraftGateway,
  clock: Clock,
  requestStore: GenerationRequestStore,
): GenerateSeriesSetupDraft {
  // activeGenerations shares one in-flight request for identical visible form input.
  const activeGenerations = new Map<
    string,
    Promise<GenerateSeriesSetupDraftResult>
  >();

  return {
    execute: (input) => {
      const operationKey: string = createGenerationOperationKey(
        'series-setup',
        input,
      );
      const activeGeneration = activeGenerations.get(operationKey);

      if (activeGeneration) {
        return activeGeneration;
      }

      const generation = generateSetupDraft({
        clock,
        gateway,
        input,
        networkStatus,
        operationKey,
        requestStore,
      }).finally((): void => {
        activeGenerations.delete(operationKey);
      });

      activeGenerations.set(operationKey, generation);

      return generation;
    },
  };
}

// generateSetupDraft performs one real online request after single-flight admission.
async function generateSetupDraft({
  clock,
  gateway,
  input,
  networkStatus,
  operationKey,
  requestStore,
}: {
  // clock supplies deterministic request identifiers for new deliberate attempts.
  readonly clock: Clock;
  // gateway owns the authenticated Edge Function transport.
  readonly gateway: SeriesSetupDraftGateway;
  // input contains the visible setup form constraints.
  readonly input: GenerateSeriesSetupDraftInput;
  // networkStatus blocks server-only generation while offline.
  readonly networkStatus: NetworkStatus;
  // operationKey maps equivalent visible input to one unfinished request.
  readonly operationKey: string;
  // requestStore preserves an unfinished request id across app restarts.
  readonly requestStore: GenerationRequestStore;
}): Promise<GenerateSeriesSetupDraftResult> {
  const connectivity = await networkStatus.getCurrentState();

  if (!connectivity.isOnline) {
    throw new Error('Series setup generation is available only when online.');
  }

  const storedRequestId = await requestStore.get(operationKey);
  const generationRequestId =
    storedRequestId ?? createGenerationRequestId('series-setup', clock.now());

  if (!storedRequestId) {
    await requestStore.save(operationKey, generationRequestId);
  }

  // request keeps one stable identity across the automatic transport retry.
  const request: GenerateSeriesSetupDraftRequest = {
    ...input,
    generationRequestId,
  };
  // draft is assigned by either the initial call or its one safe idempotent retry.
  let draft: SeriesSetupDraft;

  try {
    draft = await gateway.generateSeriesSetupDraft(request);
  } catch (error) {
    if (!shouldRetrySetupGeneration(error)) {
      throw error;
    }

    // The same request id makes this retry read or resume server work without duplicating it.
    draft = await gateway.generateSeriesSetupDraft(request);
  }

  await requestStore.remove(operationKey, generationRequestId);

  return { draft };
}

// shouldRetrySetupGeneration absorbs the transient first attempt that otherwise required another tap.
function shouldRetrySetupGeneration(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('kind' in error)) {
    return error instanceof Error;
  }

  // kind is read structurally so Application does not depend on Supabase error classes.
  const kind: unknown = error.kind;

  return kind === 'generation_in_progress' || kind === 'unavailable';
}
