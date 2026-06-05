import type { Clock, LocalSeriesStore } from '@application/ports';
import type { LearningSignal, LearningSignalKind } from '@domain/index';

// RecordLearningSignalInput is the local vocabulary event accepted by the app layer.
export type RecordLearningSignalInput = {
  // wordId identifies the bundled vocabulary item receiving the signal.
  readonly wordId: string;
  // kind records a non-punitive learner action or Word Picker decision.
  readonly kind: LearningSignalKind;
  // seriesId links the signal to one personal series when applicable.
  readonly seriesId?: string;
  // episodeId links the signal to one episode when applicable.
  readonly episodeId?: string;
};

// RecordLearningSignalResult returns the locally persisted signal record.
export type RecordLearningSignalResult = {
  // signal is the authoritative local vocabulary event after persistence.
  readonly signal: LearningSignal;
};

// RecordLearningSignal persists selected, translated, used, corrected, pinned, later, or known events.
export type RecordLearningSignal = {
  // execute writes the signal locally before any future remote sync.
  readonly execute: (
    input: RecordLearningSignalInput,
  ) => Promise<RecordLearningSignalResult>;
};

// createRecordLearningSignal injects storage and time dependencies.
export function createRecordLearningSignal(
  store: LocalSeriesStore,
  clock: Clock,
): RecordLearningSignal {
  return {
    execute: async (input) => {
      const timestamp = clock.now().toISOString();
      const signal: LearningSignal = {
        id: `${timestamp}:${input.wordId}:${input.kind}`,
        wordId: input.wordId,
        kind: input.kind,
        ...(input.seriesId ? { seriesId: input.seriesId } : {}),
        ...(input.episodeId ? { episodeId: input.episodeId } : {}),
        occurredAt: timestamp,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:learning-signal:${input.wordId}:${input.kind}`,
        },
      };

      await store.saveLearningSignal(signal);

      return { signal };
    },
  };
}
