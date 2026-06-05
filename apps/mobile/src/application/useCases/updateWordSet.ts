import type { Clock, LocalSeriesStore } from '@application/ports';
import type { WordSet } from '@domain/index';

// UpdateWordSetInput carries local edits to an existing Word Picker set.
export type UpdateWordSetInput = {
  // wordSet is the current local set snapshot from presentation state.
  readonly wordSet: WordSet;
  // addWordId includes a word in the current set when provided.
  readonly addWordId?: string;
  // removeWordId removes a word from the current set when provided.
  readonly removeWordId?: string;
};

// UpdateWordSet persists focused local Word Picker changes.
export type UpdateWordSet = {
  // execute writes the updated word set locally and returns the saved value.
  readonly execute: (input: UpdateWordSetInput) => Promise<WordSet>;
};

// createUpdateWordSet injects local storage and clock dependencies.
export function createUpdateWordSet(
  store: LocalSeriesStore,
  clock: Clock,
): UpdateWordSet {
  return {
    execute: async (input) => {
      const timestamp = clock.now().toISOString();
      const withAddedWordIds = input.addWordId
        ? unique([...input.wordSet.wordIds, input.addWordId])
        : input.wordSet.wordIds;
      const wordIds = input.removeWordId
        ? withAddedWordIds.filter((wordId) => wordId !== input.removeWordId)
        : withAddedWordIds;
      const wordSet: WordSet = {
        ...input.wordSet,
        wordIds,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:word-set:${input.wordSet.id}:update`,
          ...(input.wordSet.sync.lastSyncedAt
            ? { lastSyncedAt: input.wordSet.sync.lastSyncedAt }
            : {}),
        },
      };

      await store.saveWordSet(wordSet);

      return wordSet;
    },
  };
}

// unique removes duplicate word ids while preserving order.
function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
