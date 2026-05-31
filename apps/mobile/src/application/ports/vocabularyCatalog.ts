import type { CefrLevel, VocabularyItem } from '@domain/index';

export type VocabularyQuery = {
  readonly level?: CefrLevel;
  readonly search?: string;
};

export type VocabularyCatalog = {
  readonly getById: (id: string) => Promise<VocabularyItem | undefined>;
  readonly list: (query?: VocabularyQuery) => Promise<readonly VocabularyItem[]>;
};
