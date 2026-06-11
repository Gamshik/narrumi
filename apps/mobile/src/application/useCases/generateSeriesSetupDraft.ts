import type {
  NetworkStatus,
  SeriesSetupDraft,
  SeriesSetupDraftGateway,
  GenerateSeriesSetupDraftRequest,
} from '@application/ports';

// GenerateSeriesSetupDraftInput mirrors the editable setup form before local persistence.
export type GenerateSeriesSetupDraftInput = GenerateSeriesSetupDraftRequest;

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
): GenerateSeriesSetupDraft {
  return {
    execute: async (input) => {
      const connectivity = await networkStatus.getCurrentState();

      if (!connectivity.isOnline) {
        throw new Error('Series setup generation is available only when online.');
      }

      const draft = await gateway.generateSeriesSetupDraft(input);

      return { draft };
    },
  };
}
