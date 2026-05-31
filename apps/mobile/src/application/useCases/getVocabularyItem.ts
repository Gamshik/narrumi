import type { VocabularyCatalog } from '@application/ports/vocabularyCatalog';
import type { VocabularyItem } from '@domain/index';

// GetVocabularyItem exposes a single dictionary detail lookup by stable id.
export type GetVocabularyItem = {
  // execute returns undefined when the requested bundled word id is absent.
  readonly execute: (id: string) => Promise<VocabularyItem | undefined>;
};

// Factory contract: keeps detail lookup dependent on the vocabulary catalog port.
export function createGetVocabularyItem(
  catalog: VocabularyCatalog,
): GetVocabularyItem {
  return {
    execute: (id) => catalog.getById(id),
  };
}
