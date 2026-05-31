import type { LocalProgressStore } from '@application/ports';
import type { LearnedWordProgress } from '@domain/index';

// LoadWordProgressResult exposes validated local progress records.
export type LoadWordProgressResult = {
  // progress is every known local vocabulary progress record.
  readonly progress: readonly LearnedWordProgress[];
};

// LoadWordProgress reads local progress for dictionary filters and dashboards.
export type LoadWordProgress = {
  // execute returns validated local records from the progress store.
  readonly execute: () => Promise<LoadWordProgressResult>;
};

// createLoadWordProgress injects the local progress store port.
export function createLoadWordProgress(
  store: LocalProgressStore,
): LoadWordProgress {
  return {
    execute: async () => ({ progress: await store.getAllWordProgress() }),
  };
}
