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

import { createShuffleEpisodeStoryWords } from './shuffleEpisodeStoryWords';

// timestamp is the deterministic local write time used by shuffle tests.
const timestamp = '2026-06-07T10:00:00.000Z';

// preferences keeps shuffle output small enough to inspect directly.
const preferences: LearningPreferences = {
  preferredCefrLevel: 'B1',
  preferredGenre: 'short-fiction',
  storyWordGoal: 3,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'preferences:test',
  },
};

// vocabulary includes enough alternatives to replace every current headword.
const vocabulary: readonly VocabularyItem[] = [
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
    id: 'river',
    word: 'river',
    translation: 'река',
    partOfSpeech: 'noun',
    level: 'A1',
    examples: ['The river was cold.'],
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
  {
    id: 'brave',
    word: 'brave',
    translation: 'смелый',
    partOfSpeech: 'adjective',
    level: 'B1',
    examples: ['A brave choice changed the story.'],
    phonetics: {},
  },
  {
    id: 'climb',
    word: 'climb',
    translation: 'взбираться',
    partOfSpeech: 'verb',
    level: 'A1',
    examples: ['They climb the hill.'],
    phonetics: {},
  },
];

describe('shuffleEpisodeStoryWords', () => {
  it('saves a full new set without current visible words', async () => {
    const savedWordSets: WordSet[] = [];
    const currentWordSet: WordSet = {
      id: 'episode:current-story-words',
      kind: 'episode',
      wordIds: ['market', 'signal', 'river'],
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
    const useCase = createShuffleEpisodeStoryWords(
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
      preferences,
    });

    assert.equal(result.episodeWordSet.wordIds.length, 3);
    assert.deepEqual(result.episodeWordSet.wordIds, ['orchard', 'brave', 'climb']);
    assert.deepEqual(
      result.episodeWordSet.wordIds.some((wordId) =>
        currentWordSet.wordIds.includes(wordId),
      ),
      false,
    );
    assert.deepEqual(savedWordSets.at(-1)?.wordIds, result.episodeWordSet.wordIds);
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
