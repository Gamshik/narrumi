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

import { createChooseEpisodeStoryWord } from './chooseEpisodeStoryWord';

// timestamp is the deterministic local write time used by choose tests.
const timestamp = '2026-06-07T10:00:00.000Z';

// vocabulary includes duplicate headwords to protect manual selection rules.
const vocabulary: readonly VocabularyItem[] = [
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
  {
    id: 'market',
    word: 'market',
    partOfSpeech: 'noun',
    level: 'A1',
    examples: ['The market was busy.'],
    phonetics: {},
  },
];

describe('chooseEpisodeStoryWord', () => {
  it('saves the dictionary word selected for one slot', async () => {
    const savedWordSets: WordSet[] = [];
    const currentWordSet = createWordSet(['deal:noun', 'signal']);
    const useCase = createChooseEpisodeStoryWord(
      createStore(savedWordSets),
      createCatalog(),
      {
        now: () => new Date(timestamp),
      },
    );

    const result = await useCase.execute({
      episodeWordSet: currentWordSet,
      maxLevel: 'B1',
      replacementWordId: 'market',
      wordId: 'signal',
    });

    assert.deepEqual(result.episodeWordSet.wordIds, ['deal:noun', 'market']);
    assert.deepEqual(savedWordSets.at(-1)?.wordIds, ['deal:noun', 'market']);
  });

  it('rejects a dictionary pick that duplicates an existing visible word', async () => {
    const useCase = createChooseEpisodeStoryWord(
      createStore([]),
      createCatalog(),
      {
        now: () => new Date(timestamp),
      },
    );

    await assert.rejects(
      () =>
        useCase.execute({
          episodeWordSet: createWordSet(['deal:noun', 'signal']),
          maxLevel: 'B1',
          replacementWordId: 'deal:verb',
          wordId: 'signal',
        }),
      /already in the current Story Words/,
    );
  });
});

// createWordSet builds the current editable Story Words set for tests.
function createWordSet(wordIds: readonly string[]): WordSet {
  return {
    id: 'episode:current-story-words',
    kind: 'episode',
    wordIds,
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: false,
      pendingOperationId: 'word-set:test',
    },
  };
}

// createCatalog returns the bundled vocabulary port used by the choose use case.
function createCatalog(): VocabularyCatalog {
  return {
    getById: async (id) => vocabulary.find((word) => word.id === id),
    list: async () => vocabulary,
  };
}

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
