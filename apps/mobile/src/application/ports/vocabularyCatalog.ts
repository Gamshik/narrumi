import type { CefrLevel, VocabularyItem } from '@domain/index';

// VocabularyQuery is the read-model filter accepted by dictionary browsing.
export type VocabularyQuery = {
  // level narrows the dictionary to one CEFR bucket when provided.
  readonly level?: CefrLevel;
  // search matches local word text and part of speech without network calls.
  readonly search?: string;
};

// VocabularyCatalog is the application port for bundled or persisted vocabulary.
export type VocabularyCatalog = {
  // getById resolves details for a selected dictionary row.
  readonly getById: (id: string) => Promise<VocabularyItem | undefined>;
  // list returns the local catalog slice used by dictionary screens.
  readonly list: (query?: VocabularyQuery) => Promise<readonly VocabularyItem[]>;
};
