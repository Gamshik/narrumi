import assert from 'node:assert/strict';
import test from 'node:test';

import type { TranslationAnnotation, VocabularyItem } from '@domain/index';

import { createStoryWordSheetDetails } from './storyWordSheetDetails';

// annotation preserves the episode-specific Russian meaning for the test Story Word.
const annotation: TranslationAnnotation = {
  sentenceIndex: 1,
  surfaceText: 'electronic',
  transcription: '/ɪlekˈtrɒnɪk/',
  translation: 'электронный',
  wordId: '42',
};

// vocabularyItem provides the authoritative offline dictionary metadata.
const vocabularyItem: VocabularyItem = {
  examples: [],
  id: '42',
  level: 'B1',
  partOfSpeech: 'adjective',
  phonetics: {
    uk: '/ɪlekˈtrɒnɪk/',
    us: '/ɪlekˈtrɑːnɪk/',
  },
  translation: 'электронный',
  word: 'electronic',
};

test('builds the compact Story Word card from episode and Oxford data', (): void => {
  assert.deepEqual(createStoryWordSheetDetails(annotation, vocabularyItem), {
    partOfSpeech: 'adjective',
    transcription: '/ɪlekˈtrɑːnɪk/',
    translation: 'электронный',
    word: 'electronic',
  });
});

test('keeps legacy annotations useful when dictionary metadata is absent', (): void => {
  assert.deepEqual(createStoryWordSheetDetails(annotation), {
    partOfSpeech: '—',
    transcription: '/ɪlekˈtrɒnɪk/',
    translation: 'электронный',
    word: 'electronic',
  });
});
