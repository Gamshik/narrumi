import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type {
  Episode,
  LearningPreferences,
  LearningSignal,
  Series,
  SeriesMemory,
  SyncMetadata,
  VocabularyItem,
  WordSet,
} from '@domain/index';

import { createReplaceEpisodeStoryWord } from './replaceEpisodeStoryWord';

// timestamp is the deterministic local write time used by replacement tests.
const timestamp = '2026-06-07T10:00:00.000Z';

// vocabulary contains adjacent duplicate headwords to catch order-based replacement.
const vocabulary: readonly VocabularyItem[] = [
  {
    id: 'deal:noun',
    word: 'deal',
    translation: 'сделка',
    partOfSpeech: 'noun',
    level: 'A2',
    examples: ['The deal was fair.'],
    phonetics: {},
  },
  {
    id: 'deal:verb',
    word: 'deal',
    translation: 'иметь дело',
    partOfSpeech: 'verb',
    level: 'A2',
    examples: ['They deal with it.'],
    phonetics: {},
  },
  {
    id: 'signal',
    word: 'signal',
    translation: 'сигнал',
    partOfSpeech: 'noun',
    level: 'A2',
    examples: ['The signal was clear.'],
    phonetics: {},
  },
  {
    id: 'market',
    word: 'market',
    translation: 'рынок',
    partOfSpeech: 'noun',
    level: 'A1',
    examples: ['The market was busy.'],
    phonetics: {},
  },
];

describe('replaceEpisodeStoryWord', () => {
  it('replaces from a random pool without duplicate visible words', async () => {
    const savedWordSets: WordSet[] = [];
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['deal:noun', 'signal'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:test',
      },
    };
    const catalog: VocabularyCatalog = {
      getById: async (id) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    const useCase = createReplaceEpisodeStoryWord(
      createStore(savedWordSets),
      catalog,
      {
        now: () => new Date(timestamp),
      },
      () => 0,
    );

    const result = await useCase.execute({
      episodeWordSet: currentWordSet,
      maxLevel: 'B1',
      wordId: 'signal',
    });

    assert.deepEqual(result.episodeWordSet.wordIds, ['deal:noun', 'market']);
    assert.deepEqual(
      result.words.map((word) => word.id),
      ['deal:noun', 'market'],
    );
    assert.deepEqual(savedWordSets.at(-1)?.wordIds, ['deal:noun', 'market']);
  });

  it('does not block a replacement with the same first letter', async () => {
    const savedWordSets: WordSet[] = [];
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['market', 'signal'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:test',
      },
    };
    const initialVocabulary: readonly VocabularyItem[] = [
      {
        id: 'market',
        word: 'market',
        translation: 'рынок',
        partOfSpeech: 'noun',
        level: 'A1',
        examples: ['The market was busy.'],
        phonetics: {},
      },
      {
        id: 'signal',
        word: 'signal',
        translation: 'сигнал',
        partOfSpeech: 'noun',
        level: 'A2',
        examples: ['The signal was clear.'],
        phonetics: {},
      },
      {
        id: 'melody',
        word: 'melody',
        translation: 'мелодия',
        partOfSpeech: 'noun',
        level: 'B1',
        examples: ['The melody changed.'],
        phonetics: {},
      },
      {
        id: 'orchard',
        word: 'orchard',
        translation: 'фруктовый сад',
        partOfSpeech: 'noun',
        level: 'B1',
        examples: ['The orchard was quiet.'],
        phonetics: {},
      },
    ];
    const catalog: VocabularyCatalog = {
      getById: async (id) => initialVocabulary.find((word) => word.id === id),
      list: async () => initialVocabulary,
    };
    const useCase = createReplaceEpisodeStoryWord(
      createStore(savedWordSets),
      catalog,
      {
        now: () => new Date(timestamp),
      },
      () => 0,
    );

    const result = await useCase.execute({
      episodeWordSet: currentWordSet,
      maxLevel: 'B1',
      wordId: 'signal',
    });

    assert.deepEqual(result.episodeWordSet.wordIds, ['market', 'melody']);
  });
});

// createStore implements the local ports needed by this use case only.
function createStore(savedWordSets: WordSet[]): LocalSeriesStore {
  return {
    getSeriesSetupDraft: async () => undefined,
    saveSeriesSetupDraft: async () => undefined,
    deleteSeriesSetupDraft: async () => undefined,
    getPreferences: async (): Promise<LearningPreferences | undefined> => undefined,
    readBootstrapPreferences: async () => ({ preferences: undefined, recovered: false }),
    savePreferences: async () => undefined,
    listSeries: async (): Promise<readonly Series[]> => [],
    getSeries: async (): Promise<Series | undefined> => undefined,
    saveSeries: async () => undefined,
    deleteSeries: async () => undefined,
    listEpisodes: async (): Promise<readonly Episode[]> => [],
    getEpisode: async (): Promise<Episode | undefined> => undefined,
    saveEpisode: async () => undefined,
    deleteEpisode: async () => undefined,
    getSeriesMemory: async (): Promise<SeriesMemory | undefined> => undefined,
    saveSeriesMemory: async () => undefined,
    listWordSets: async (): Promise<readonly WordSet[]> => [],
    saveWordSet: async (wordSet) => {
      savedWordSets.push(wordSet);
    },
    listLearningSignals: async (): Promise<readonly LearningSignal[]> => [],
    saveLearningSignal: async () => undefined,
    getSyncMetadata: async (): Promise<SyncMetadata | undefined> => undefined,
    saveSyncMetadata: async () => undefined,
  };
}
