import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { VocabularyItem, WordSet } from '@domain/index';

// ReplaceEpisodeStoryWordInput identifies the editable episode set and changed word.
export type ReplaceEpisodeStoryWordInput = {
  // episodeWordSet is the current editable Story Words set.
  readonly episodeWordSet: WordSet;
  // wordId is replaced only in the episode set, not in Today's Words.
  readonly wordId: string;
};

// ReplaceEpisodeStoryWordResult returns the saved set and visible words.
export type ReplaceEpisodeStoryWordResult = {
  // episodeWordSet is the updated local current selection.
  readonly episodeWordSet: WordSet;
  // words are resolved vocabulary items for the updated set.
  readonly words: readonly VocabularyItem[];
};

// ReplaceEpisodeStoryWord changes one current episode word without deleting daily history.
export type ReplaceEpisodeStoryWord = {
  // execute persists a replacement in the editable episode word set.
  readonly execute: (
    input: ReplaceEpisodeStoryWordInput,
  ) => Promise<ReplaceEpisodeStoryWordResult>;
};

// createReplaceEpisodeStoryWord injects storage, vocabulary, and clock dependencies.
export function createReplaceEpisodeStoryWord(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  clock: Clock,
): ReplaceEpisodeStoryWord {
  return {
    execute: async ({ episodeWordSet, wordId }) => {
      const vocabulary = await catalog.list();
      const replacementId = findReplacementWordId({
        currentWordIds: episodeWordSet.wordIds,
        vocabulary,
        wordId,
      });
      const timestamp = clock.now().toISOString();
      const wordIds = episodeWordSet.wordIds.map((currentWordId) =>
        currentWordId === wordId ? replacementId : currentWordId,
      );
      const updatedWordSet: WordSet = {
        ...episodeWordSet,
        wordIds,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:word-set:${episodeWordSet.id}:replace`,
          ...(episodeWordSet.sync.lastSyncedAt
            ? { lastSyncedAt: episodeWordSet.sync.lastSyncedAt }
            : {}),
        },
      };
      const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
      const words = wordIds.flatMap((currentWordId) => {
        const word = wordsById.get(currentWordId);

        return word ? [word] : [];
      });

      await store.saveWordSet(updatedWordSet);

      return { episodeWordSet: updatedWordSet, words };
    },
  };
}

// findReplacementWordId chooses the next deterministic catalog word outside the set.
function findReplacementWordId({
  currentWordIds,
  vocabulary,
  wordId,
}: {
  // currentWordIds are already selected for the current episode.
  readonly currentWordIds: readonly string[];
  // vocabulary provides deterministic replacement candidates.
  readonly vocabulary: readonly VocabularyItem[];
  // wordId is the word being replaced.
  readonly wordId: string;
}): string {
  const selected = new Set(currentWordIds);
  const currentIndex = vocabulary.findIndex((word) => word.id === wordId);
  const rotatedVocabulary = [
    ...vocabulary.slice(Math.max(0, currentIndex + 1)),
    ...vocabulary.slice(0, Math.max(0, currentIndex + 1)),
  ];
  const replacement = rotatedVocabulary.find((word) => !selected.has(word.id));

  return replacement?.id ?? wordId;
}
