import type {
  VocabularyCatalog,
  VocabularyQuery,
} from '@application/ports/vocabularyCatalog';
import type { VocabularyItem } from '@domain/index';

// BrowseVocabulary exposes the dictionary list use case to presentation code.
export type BrowseVocabulary = {
  // execute returns vocabulary rows from the injected catalog using optional filters.
  readonly execute: (
    query?: VocabularyQuery,
  ) => Promise<readonly VocabularyItem[]>;
};

// Factory contract: injects the catalog port while keeping UI independent from storage.
export function createBrowseVocabulary(
  catalog: VocabularyCatalog,
): BrowseVocabulary {
  return {
    execute: (query) => catalog.list(query),
  };
}
