import type {
  VocabularyCatalog,
  VocabularyQuery,
} from '@application/ports/vocabularyCatalog';
import type { VocabularyItem } from '@domain/index';

export type BrowseVocabulary = {
  readonly execute: (
    query?: VocabularyQuery,
  ) => Promise<readonly VocabularyItem[]>;
};

export function createBrowseVocabulary(
  catalog: VocabularyCatalog,
): BrowseVocabulary {
  return {
    execute: (query) => catalog.list(query),
  };
}
