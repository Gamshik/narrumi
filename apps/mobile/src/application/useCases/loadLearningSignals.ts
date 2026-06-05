import type { LocalLearningSignalFilter, LocalSeriesStore } from '@application/ports';
import type { LearningSignal } from '@domain/index';

// LoadLearningSignalsInput scopes internal signal reads for suggestions or filters.
export type LoadLearningSignalsInput = LocalLearningSignalFilter;

// LoadLearningSignalsResult exposes validated local learning signal records.
export type LoadLearningSignalsResult = {
  // signals are non-punitive vocabulary events, not review states.
  readonly signals: readonly LearningSignal[];
};

// LoadLearningSignals reads local signals for dictionary filters and Word Picker scoring.
export type LoadLearningSignals = {
  // execute returns validated local signal records from the series store.
  readonly execute: (
    input?: LoadLearningSignalsInput,
  ) => Promise<LoadLearningSignalsResult>;
};

// createLoadLearningSignals injects the local series store port.
export function createLoadLearningSignals(
  store: LocalSeriesStore,
): LoadLearningSignals {
  return {
    execute: async (input = {}) => ({
      signals: await store.listLearningSignals(input),
    }),
  };
}
