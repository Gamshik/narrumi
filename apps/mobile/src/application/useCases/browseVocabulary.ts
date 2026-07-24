import type {
  VocabularyCatalog,
  VocabularyQuery,
} from '@application/ports/vocabularyCatalog';
import type { VocabularyItem } from '@domain/index';

import {
  isStoryWordCandidate,
  normalizeStoryWordText,
} from './storyWordSelection';

// BrowseVocabularyInput extends general catalog filters for Story Words replacement.
export type BrowseVocabularyInput = VocabularyQuery & {
  // excludedWordIds removes the current Story Words and duplicate headwords.
  readonly excludedWordIds?: readonly string[];
};

// BrowseVocabulary exposes the dictionary list use case to presentation code.
export type BrowseVocabulary = {
  // execute returns vocabulary rows from the injected catalog using optional filters.
  readonly execute: (
    input?: BrowseVocabularyInput,
  ) => Promise<readonly VocabularyItem[]>;
};

// Factory contract: injects the catalog port while keeping UI independent from storage.
export function createBrowseVocabulary(
  catalog: VocabularyCatalog,
): BrowseVocabulary {
  return {
    execute: async (input = {}): Promise<readonly VocabularyItem[]> => {
      const { excludedWordIds = [], ...query } = input;
      const [words, excludedWords] = await Promise.all([
        catalog.list(query),
        Promise.all(excludedWordIds.map((wordId) => catalog.getById(wordId))),
      ]);
      // excludedWordKeys also hides alternate Oxford entries for a selected headword.
      const excludedWordKeys: ReadonlySet<string> = new Set(
        excludedWords.flatMap((word) =>
          word ? [normalizeStoryWordText(word.word)] : [],
        ),
      );

      return words.filter((word) => {
        if (excludedWordKeys.has(normalizeStoryWordText(word.word))) {
          return false;
        }

        return isStoryWordCandidate(word);
      });
    },
  };
}
