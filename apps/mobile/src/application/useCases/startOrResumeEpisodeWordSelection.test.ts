import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type {
  LearningPreferences,
  LearningSignal,
  Series,
  SeriesMemory,
  SyncMetadata,
  VocabularyItem,
  WordSet,
} from '@domain/index';

import { createStartOrResumeEpisodeWordSelection } from './startOrResumeEpisodeWordSelection';
import { selectStoryWordIds } from './storyWordSelection';

// timestamp is the deterministic local write time used by word-set tests.
const timestamp = '2026-06-07T10:00:00.000Z';

// preferences keeps the test focused on a small deterministic Story Words set.
const preferences: LearningPreferences = {
  preferredCefrLevel: 'B1',
  preferredGenre: 'short-fiction',
  storyWordGoal: 2,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'preferences:test',
  },
};

// vocabulary contains a function word first to reproduce the Oxford seed ordering issue.
const vocabulary: readonly VocabularyItem[] = [
  {
    id: '0',
    word: 'a',
    partOfSpeech: 'indefinite article',
    level: 'A1',
    examples: ['a door'],
    phonetics: {},
  },
  {
    id: '1',
    word: 'abandon',
    partOfSpeech: 'verb',
    level: 'B2',
    examples: ['They abandon the plan.'],
    phonetics: {},
  },
  {
    id: '2',
    word: 'ability',
    partOfSpeech: 'noun',
    level: 'A2',
    examples: ['She has the ability to listen.'],
    phonetics: {},
  },
  {
    id: '3',
    word: 'careful',
    partOfSpeech: 'adjective',
    level: 'A2',
    examples: ['Be careful near the door.'],
    phonetics: {},
  },
  {
    id: '4',
    word: 'mystery',
    partOfSpeech: 'noun',
    level: 'B1',
    examples: ['The old map was a mystery.'],
    phonetics: {},
  },
];

describe('startOrResumeEpisodeWordSelection', () => {
  it('returns a valid last-used episode Story Words set without reshuffling it', async () => {
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['2', '3'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:test',
      },
    };
    const todayWordSet: WordSet = {
      id: 'today:2026-06-07',
      kind: 'today',
      dateKey: '2026-06-07',
      wordIds: ['2', '3'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:today:test',
      },
    };
    const savedWordSets: WordSet[] = [];
    const store = createStore({
      savedWordSets,
      wordSets: [currentWordSet, todayWordSet],
    });
    const catalog: VocabularyCatalog = {
      getById: async (id) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    const useCase = createStartOrResumeEpisodeWordSelection(store, catalog, {
      now: () => new Date(timestamp),
    });

    const result = await useCase.execute();

    assert.deepEqual(result.episodeWordSet.wordIds, currentWordSet.wordIds);
    assert.deepEqual(savedWordSets, []);
  });

  it('removes function words from existing episode Story Words', async () => {
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['0', '1'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:test',
      },
    };
    const savedWordSets: WordSet[] = [];
    const store = createStore({
      savedWordSets,
      wordSets: [currentWordSet],
    });
    const catalog: VocabularyCatalog = {
      getById: async (id) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    const useCase = createStartOrResumeEpisodeWordSelection(store, catalog, {
      now: () => new Date(timestamp),
    });

    const result = await useCase.execute();

    assert.equal(result.episodeWordSet.wordIds.length, 2);
    assert.equal(result.episodeWordSet.wordIds.includes('0'), false);
    assert.equal(result.episodeWordSet.wordIds.includes('1'), false);
    assert.deepEqual(savedWordSets.at(-1)?.wordIds, result.episodeWordSet.wordIds);
  });

  it('creates daily Story Words from shuffled candidates instead of vocabulary order', async () => {
    const savedWordSets: WordSet[] = [];
    const store = createStore({
      savedWordSets,
      wordSets: [],
    });
    const catalog: VocabularyCatalog = {
      getById: async (id) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    const useCase = createStartOrResumeEpisodeWordSelection(store, catalog, {
      now: () => new Date(timestamp),
    });

    const result = await useCase.execute();

    assert.equal(result.todayWordSet.wordIds.includes('0'), false);
    assert.equal(result.todayWordSet.wordIds.includes('1'), false);
    assert.notDeepEqual(result.todayWordSet.wordIds, ['2', '3']);
  });

  it('keeps only one Oxford entry for the same visible word', async () => {
    const duplicatedVocabulary: readonly VocabularyItem[] = [
      {
        id: 'deal:noun',
        word: 'deal',
        partOfSpeech: 'noun',
        level: 'A2',
        examples: ['The deal was fair.'],
        phonetics: {},
      },
      {
        id: 'deal:verb',
        word: 'deal',
        partOfSpeech: 'verb',
        level: 'A2',
        examples: ['They deal with it.'],
        phonetics: {},
      },
      {
        id: 'signal',
        word: 'signal',
        partOfSpeech: 'noun',
        level: 'A2',
        examples: ['The signal was clear.'],
        phonetics: {},
      },
    ];
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['deal:noun', 'deal:verb'],
      createdAt: timestamp,
      updatedAt: timestamp,
      sync: {
        isDirty: false,
        pendingOperationId: 'word-set:test',
      },
    };
    const savedWordSets: WordSet[] = [];
    const store = createStore({
      savedWordSets,
      wordSets: [currentWordSet],
    });
    const catalog: VocabularyCatalog = {
      getById: async (id) => duplicatedVocabulary.find((word) => word.id === id),
      list: async () => duplicatedVocabulary,
    };
    const useCase = createStartOrResumeEpisodeWordSelection(store, catalog, {
      now: () => new Date(timestamp),
    });

    const result = await useCase.execute();

    assert.equal(result.episodeWordSet.wordIds.length, 2);
    assert.equal(
      result.words.filter((word) => word.word === 'deal').length,
      1,
    );
    assert.equal(result.words.some((word) => word.word === 'signal'), true);
  });

  it('allows different words with the same first letter', () => {
    const sameInitialVocabulary: readonly VocabularyItem[] = [
      {
        id: 'army',
        word: 'army',
        partOfSpeech: 'noun',
        level: 'A2',
        examples: ['The army waited.'],
        phonetics: {},
      },
      {
        id: 'aged',
        word: 'aged',
        partOfSpeech: 'adjective',
        level: 'B1',
        examples: ['The aged map tore.'],
        phonetics: {},
      },
      {
        id: 'anywhere',
        word: 'anywhere',
        partOfSpeech: 'adverb',
        level: 'A2',
        examples: ['They could go anywhere.'],
        phonetics: {},
      },
      {
        id: 'climb',
        word: 'climb',
        partOfSpeech: 'verb',
        level: 'A1',
        examples: ['They climb the hill.'],
        phonetics: {},
      },
      {
        id: 'market',
        word: 'market',
        partOfSpeech: 'noun',
        level: 'A1',
        examples: ['The market was busy.'],
        phonetics: {},
      },
    ];

    const selectedIds = selectStoryWordIds({
      goal: 3,
      maxLevel: 'B1',
      seed: '2026-06-07',
      sourceWordIds: ['army', 'aged'],
      vocabulary: sameInitialVocabulary,
    });
    const selectedWords = selectedIds.map((wordId) => {
      const word = sameInitialVocabulary.find((candidate) => candidate.id === wordId);

      assert.ok(word);

      return word.word;
    });

    assert.equal(selectedWords.includes('army'), true);
    assert.equal(selectedWords.includes('aged'), true);
  });
});

// createStore implements the local ports needed by this use case only.
function createStore({
  savedWordSets,
  wordSets,
}: {
  // savedWordSets captures local-first writes performed by the use case.
  readonly savedWordSets: WordSet[];
  // wordSets are the existing local records returned by listWordSets.
  readonly wordSets: readonly WordSet[];
}): LocalSeriesStore {
  return {
    getPreferences: async () => preferences,
    savePreferences: async () => undefined,
    listSeries: async (): Promise<readonly Series[]> => [],
    getSeries: async (): Promise<Series | undefined> => undefined,
    saveSeries: async () => undefined,
    deleteSeries: async () => undefined,
    listEpisodes: async () => [],
    getEpisode: async () => undefined,
    saveEpisode: async () => undefined,
    deleteEpisode: async () => undefined,
    getSeriesMemory: async (): Promise<SeriesMemory | undefined> => undefined,
    saveSeriesMemory: async () => undefined,
    listWordSets: async (filter = {}) =>
      wordSets.filter((wordSet) =>
        filter.dateKey ? wordSet.dateKey === filter.dateKey : true,
      ),
    saveWordSet: async (wordSet) => {
      savedWordSets.push(wordSet);
    },
    listLearningSignals: async (): Promise<readonly LearningSignal[]> => [],
    saveLearningSignal: async () => undefined,
    getSyncMetadata: async (): Promise<SyncMetadata | undefined> => undefined,
    saveSyncMetadata: async () => undefined,
  };
}
