import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { LearningPreferences, VocabularyItem, WordSet } from '@domain/index';

import { selectStoryWordIds } from './storyWordSelection';

// ShuffleEpisodeStoryWordsInput identifies the current set and selection settings.
export type ShuffleEpisodeStoryWordsInput = {
  // episodeWordSet is the editable Story Words set being fully replaced.
  readonly episodeWordSet: WordSet;
  // preferences provide the target count and CEFR ceiling for new words.
  readonly preferences: LearningPreferences;
};

// ShuffleEpisodeStoryWordsResult returns the saved set and resolved words.
export type ShuffleEpisodeStoryWordsResult = {
  // episodeWordSet is the updated local current selection.
  readonly episodeWordSet: WordSet;
  // words are resolved vocabulary items for immediate presentation.
  readonly words: readonly VocabularyItem[];
};

// ShuffleEpisodeStoryWords replaces the whole current set only on explicit user action.
export type ShuffleEpisodeStoryWords = {
  // execute persists a new full Story Words set locally before any remote sync.
  readonly execute: (
    input: ShuffleEpisodeStoryWordsInput,
  ) => Promise<ShuffleEpisodeStoryWordsResult>;
};

// createShuffleEpisodeStoryWords injects storage, vocabulary, and clock boundaries.
export function createShuffleEpisodeStoryWords(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  clock: Clock,
  random: () => number = Math.random,
): ShuffleEpisodeStoryWords {
  return {
    execute: async ({ episodeWordSet, preferences }) => {
      const timestamp = clock.now().toISOString();
      const vocabulary = await catalog.list();
      const wordIds = selectStoryWordIds({
        excludeWordIds: episodeWordSet.wordIds,
        goal: preferences.storyWordGoal,
        maxLevel: preferences.preferredCefrLevel,
        random,
        seed: timestamp,
        sourceWordIds: [],
        vocabulary,
      });
      const updatedWordSet: WordSet = {
        ...episodeWordSet,
        wordIds,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:word-set:${episodeWordSet.id}:shuffle`,
          ...(episodeWordSet.sync.lastSyncedAt
            ? { lastSyncedAt: episodeWordSet.sync.lastSyncedAt }
            : {}),
        },
      };
      const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
      const words = wordIds.flatMap((wordId) => {
        const word = wordsById.get(wordId);

        return word ? [word] : [];
      });

      await store.saveWordSet(updatedWordSet);

      return { episodeWordSet: updatedWordSet, words };
    },
  };
}
