import assert from 'node:assert/strict';
import test from 'node:test';

import type { VocabularyCatalog } from '@application/ports';
import type { VocabularyItem } from '@domain/index';

import { createBrowseVocabulary } from './browseVocabulary';

// vocabulary contains duplicate headwords and an above-level candidate for picker filtering.
const vocabulary: readonly VocabularyItem[] = [
  {
    id: 'deal:noun',
    word: 'deal',
    translation: 'сделка',
    partOfSpeech: 'noun',
    level: 'A2',
    examples: ['It was a fair deal.'],
    phonetics: {},
  },
  {
    id: 'deal:verb',
    word: 'deal',
    translation: 'иметь дело',
    partOfSpeech: 'verb',
    level: 'A2',
    examples: ['They deal with the problem.'],
    phonetics: {},
  },
  {
    id: 'drift',
    word: 'drift',
    translation: 'дрейфовать',
    partOfSpeech: 'verb',
    level: 'A2',
    examples: ['The boat began to drift.'],
    phonetics: {},
  },
  {
    id: 'intricate',
    word: 'intricate',
    translation: 'сложный',
    partOfSpeech: 'adjective',
    level: 'C1',
    examples: ['The clock has an intricate mechanism.'],
    phonetics: {},
  },
];

test('Story Words browsing hides selected headwords without filtering Oxford levels', async (): Promise<void> => {
  // catalog provides the local read operations used by replacement browsing.
  const catalog: VocabularyCatalog = {
    getById: async (id: string): Promise<VocabularyItem | undefined> =>
      vocabulary.find((word) => word.id === id),
    list: async (): Promise<readonly VocabularyItem[]> => vocabulary,
  };
  const browseVocabulary = createBrowseVocabulary(catalog);

  const results = await browseVocabulary.execute({
    excludedWordIds: ['deal:noun'],
  });

  assert.deepEqual(
    results.map((word) => word.id),
    ['drift', 'intricate'],
  );
});
