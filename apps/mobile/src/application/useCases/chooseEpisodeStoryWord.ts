import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { CefrLevel, VocabularyItem, WordSet } from '@domain/index';

import { isStoryWordCandidate, normalizeStoryWordText } from './storyWordSelection';

// ChooseEpisodeStoryWordInput identifies one editable slot and user-selected word.
export type ChooseEpisodeStoryWordInput = {
  // episodeWordSet is the current local Story Words set.
  readonly episodeWordSet: WordSet;
  // maxLevel prevents manual picks above the learner's configured CEFR ceiling.
  readonly maxLevel: CefrLevel;
  // replacementWordId is the dictionary word selected by the user.
  readonly replacementWordId: string;
  // wordId is the current slot being replaced.
  readonly wordId: string;
};

// ChooseEpisodeStoryWordResult returns the saved set and resolved visible words.
export type ChooseEpisodeStoryWordResult = {
  // episodeWordSet is the updated local current selection.
  readonly episodeWordSet: WordSet;
  // words are resolved vocabulary items for the updated set.
  readonly words: readonly VocabularyItem[];
};

// ChooseEpisodeStoryWord replaces one Story Word with a validated dictionary pick.
export type ChooseEpisodeStoryWord = {
  // execute persists the user's explicit dictionary choice locally.
  readonly execute: (
    input: ChooseEpisodeStoryWordInput,
  ) => Promise<ChooseEpisodeStoryWordResult>;
};

// createChooseEpisodeStoryWord injects storage, vocabulary, and clock dependencies.
export function createChooseEpisodeStoryWord(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  clock: Clock,
): ChooseEpisodeStoryWord {
  return {
    execute: async ({ episodeWordSet, maxLevel, replacementWordId, wordId }) => {
      const vocabulary = await catalog.list();
      const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
      const replacement = wordsById.get(replacementWordId);

      if (!replacement || !isStoryWordCandidate(replacement, maxLevel)) {
        throw new Error('Selected dictionary word is not available for Story Words.');
      }

      const replacementKey = normalizeStoryWordText(replacement.word);
      const hasSameVisibleWord = episodeWordSet.wordIds
        .filter((currentWordId) => currentWordId !== wordId)
        .map((currentWordId) => wordsById.get(currentWordId))
        .filter((word): word is VocabularyItem => Boolean(word))
        .some((word) => normalizeStoryWordText(word.word) === replacementKey);

      if (hasSameVisibleWord) {
        throw new Error('This word is already in the current Story Words.');
      }

      const timestamp = clock.now().toISOString();
      const wordIds = episodeWordSet.wordIds.map((currentWordId) =>
        currentWordId === wordId ? replacement.id : currentWordId,
      );
      const updatedWordSet: WordSet = {
        ...episodeWordSet,
        wordIds,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:word-set:${episodeWordSet.id}:choose`,
          ...(episodeWordSet.sync.lastSyncedAt
            ? { lastSyncedAt: episodeWordSet.sync.lastSyncedAt }
            : {}),
        },
      };
      const words = wordIds.flatMap((currentWordId) => {
        const word = wordsById.get(currentWordId);

        return word ? [word] : [];
      });

      await store.saveWordSet(updatedWordSet);

      return { episodeWordSet: updatedWordSet, words };
    },
  };
}
