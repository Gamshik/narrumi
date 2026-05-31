import type { VocabularyCatalog } from '@application/ports/vocabularyCatalog';
import type { VocabularyItem } from '@domain/index';

export type GetVocabularyItem = {
  readonly execute: (id: string) => Promise<VocabularyItem | undefined>;
};

export function createGetVocabularyItem(
  catalog: VocabularyCatalog,
): GetVocabularyItem {
  return {
    execute: (id) => catalog.getById(id),
  };
}
