import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  EpisodeGenerationGateway,
  LocalSeriesStore,
  NetworkStatus,
} from '@application/ports';
import type {
  Episode,
  Series,
  SeriesMemory,
  VocabularyItem,
  WordSet,
} from '@domain/index';

import { createGenerateEpisode } from './generateEpisode';

// timestamp is the deterministic local write time used by the regression test.
const timestamp = '2026-06-06T10:00:00.000Z';

// memory is the compact continuity record sent to the AI boundary.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira wants to find a hidden city garden.',
  genre: 'short-fiction',
  tone: 'mysterious but friendly',
  mainCharacters: ['Mira'],
  knownFacts: [],
  openQuestions: [],
  importantObjectsOrLocations: [],
  recurringStoryWordIds: [],
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'memory:initial',
  },
};

// series is the user-written setup that must shape episode generation.
const series: Series = {
  id: 'series:test',
  title: 'Garden After Midnight',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: memory.tone,
  premise: memory.premise,
  mainCharacters: memory.mainCharacters,
  memory,
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'series:initial',
  },
};

// episodeWordSet is the editable Story Words set selected before generation.
const episodeWordSet: WordSet = {
  id: 'episode-words:test',
  kind: 'episode',
  seriesId: series.id,
  wordIds: ['word:curious'],
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'word-set:initial',
  },
};

// vocabulary resolves selected Story Words before calling the Edge boundary.
const vocabulary: readonly VocabularyItem[] = [
  {
    id: 'word:curious',
    word: 'curious',
    partOfSpeech: 'adjective',
    level: 'B1',
    examples: ['Mira felt curious.'],
    phonetics: {},
  },
];

describe('generateEpisode', () => {
  it('sends the user-written series title and selected genre to the AI boundary', async () => {
    // savedEpisodes captures local persistence after the AI payload is validated.
    const savedEpisodes: Episode[] = [];
    // store implements only deterministic in-memory behavior needed by this use case.
    const store: LocalSeriesStore = {
      getPreferences: async () => undefined,
      savePreferences: async () => undefined,
      listSeries: async () => [series],
      getSeries: async () => series,
      saveSeries: async () => undefined,
      deleteSeries: async () => undefined,
      listEpisodes: async () => [],
      getEpisode: async () => undefined,
      saveEpisode: async (episode) => {
        savedEpisodes.push(episode);
      },
      deleteEpisode: async () => undefined,
      getSeriesMemory: async () => memory,
      saveSeriesMemory: async () => undefined,
      listWordSets: async () => [],
      saveWordSet: async () => undefined,
      listLearningSignals: async () => [],
      saveLearningSignal: async () => undefined,
      getSyncMetadata: async () => undefined,
      saveSyncMetadata: async () => undefined,
    };
    // catalog resolves the selected Oxford ids into bounded AI Story Words.
    const catalog = {
      getById: async (id: string) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    // networkStatus keeps the server-backed generation path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gateway asserts that user-written series fields reach the AI boundary.
    const gateway: EpisodeGenerationGateway = {
      generateEpisode: async (request) => {
        assert.equal(request.seriesTitle, 'Garden After Midnight');
        assert.equal(request.genre, 'travel-leisure');
        assert.equal(request.compactSeriesMemory.genre, 'travel-leisure');

        return {
          title: 'The Midnight Gate',
          sceneText:
            'Mira found a silver gate. She felt curious. A bell rang softly.',
          sentences: [
            'Mira found a silver gate.',
            'She felt curious.',
            'A bell rang softly.',
          ],
          sentenceFrames: [
            {
              kind: 'narration',
              text: 'Mira found a silver gate.',
            },
            {
              kind: 'narration',
              text: 'She felt curious.',
            },
            {
              kind: 'narration',
              text: 'A bell rang softly.',
            },
          ],
          storyWordIds: ['word:curious'],
          annotations: [
            {
              wordId: 'word:curious',
              surfaceText: 'curious',
              translation: 'любопытный',
              sentenceIndex: 1,
            },
          ],
          interaction: {
            kind: 'choice',
            prompt: 'What should Mira do?',
            choices: [
              { id: 'open', label: 'Open the gate' },
              { id: 'wait', label: 'Wait and listen' },
            ],
          },
          cliffhanger: 'The gate opened by itself.',
          summaryUpdate: 'Mira found a silver gate that opened by itself.',
          memoryUpdate: {
            knownFacts: ['Mira found a silver gate.'],
            openQuestions: ['Where does the gate lead?'],
            importantObjectsOrLocations: ['silver gate'],
            lastEpisodeSummary:
              'Mira found a silver gate that opened by itself.',
            unresolvedCliffhanger: 'The gate opened by itself.',
            recurringStoryWordIds: ['word:curious'],
          },
        };
      },
    };
    const useCase = createGenerateEpisode(
      store,
      catalog,
      networkStatus,
      gateway,
      { now: () => new Date(timestamp) },
    );

    const result = await useCase.execute({
      episodeWordSet,
      genre: 'travel-leisure',
      seriesId: series.id,
    });

    assert.equal(result.episode.title, 'The Midnight Gate');
    assert.equal(savedEpisodes.length, 1);
  });
});
