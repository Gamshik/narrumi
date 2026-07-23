import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  EpisodeGenerationGateway,
  GenerationRequestStore,
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

// characterProfiles pin dialogue labels separately from AI-facing descriptions.
const characterProfiles = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A curious learner following the hidden garden mystery.',
  },
] as const;

// memory is the compact continuity record sent to the AI boundary.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira wants to find a hidden city garden.',
  genre: 'short-fiction',
  tone: 'mysterious but friendly',
  participationMode: 'director',
  mainCharacters: ['Mira'],
  characterProfiles,
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
  participationMode: memory.participationMode,
  mainCharacters: memory.mainCharacters,
  characterProfiles,
  creativeBrief: {
    idea: '',
    worldAndSetting: '',
    backstory: '',
    storyDriver: '',
    mustInclude: '',
    avoid: '',
    draftStrategy: 'fill-missing',
  },
  setupDraftMeta: { aiGeneratedFields: [] },
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
    translation: 'любопытный',
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
    const store = createStore([], savedEpisodes);
    // catalog resolves the selected Oxford ids into bounded AI Story Words.
    const catalog = {
      getById: async (id: string) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    // networkStatus keeps the server-backed generation path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gatewayCallCount proves concurrent presses share one expensive generation.
    let gatewayCallCount = 0;
    // gateway asserts that user-written series fields reach the AI boundary.
    const gateway: EpisodeGenerationGateway = {
      generateEpisode: async (request) => {
        gatewayCallCount += 1;
        assert.match(request.generationRequestId, /^generation:/);
        assert.equal(request.seriesTitle, 'Garden After Midnight');
        assert.equal(request.genre, 'travel-leisure');
        assert.equal(request.participationMode, 'director');
        assert.equal(request.compactSeriesMemory.genre, 'travel-leisure');
        assert.equal(request.compactSeriesMemory.participationMode, 'director');
        assert.deepEqual(request.selectedStoryWords, [
          {
            id: 'word:curious',
            word: 'curious',
            partOfSpeech: 'adjective',
            level: 'B1',
            usageExamples: ['Mira felt curious.'],
          },
        ]);

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
      createMemoryGenerationRequestStore(),
    );

    const input = {
      episodeWordSet,
      genre: 'travel-leisure',
      seriesId: series.id,
    } as const;
    const result = await useCase.execute(input);

    assert.equal(result.episode.title, 'The Midnight Gate');
    assert.equal(result.episode.id, 'episode:series:test:1');
    assert.equal(gatewayCallCount, 1);
    assert.equal(savedEpisodes.length, 1);
  });

  it('blocks a new episode while the latest local episode is incomplete', async () => {
    // gatewayCallCount must remain zero when the local completion guard rejects.
    let gatewayCallCount: number = 0;
    // gateway would expose a regression if generation reached the remote boundary.
    const gateway: EpisodeGenerationGateway = {
      generateEpisode: async () => {
        gatewayCallCount += 1;
        throw new Error('Unexpected generation call');
      },
    };
    const store = createStore([createEpisode(false)], []);
    const useCase = createGenerateEpisode(
      store,
      {
        getById: async () => undefined,
        list: async () => vocabulary,
      },
      { getCurrentState: async () => ({ isOnline: true }) },
      gateway,
      { now: () => new Date(timestamp) },
      createMemoryGenerationRequestStore(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          episodeWordSet,
          seriesId: series.id,
        }),
      /Finish the current episode/,
    );
    assert.equal(gatewayCallCount, 0);
  });

  it('keeps one request id when a lost response is retried with changed inputs', async () => {
    // requestIds proves the logical attempt survives a visible input change.
    const requestIds: string[] = [];
    // gateway simulates a response that never reaches local persistence.
    const gateway: EpisodeGenerationGateway = {
      generateEpisode: async (request): Promise<never> => {
        requestIds.push(request.generationRequestId);
        throw new Error('Simulated lost response');
      },
    };
    const requestStore: GenerationRequestStore =
      createMemoryGenerationRequestStore();
    const useCase = createGenerateEpisode(
      createStore([], []),
      {
        getById: async (id: string) => vocabulary.find((word) => word.id === id),
        list: async () => vocabulary,
      },
      { getCurrentState: async () => ({ isOnline: true }) },
      gateway,
      { now: () => new Date(timestamp) },
      requestStore,
    );

    await assert.rejects(
      () =>
        useCase.execute({
          episodeWordSet,
          seriesId: series.id,
        }),
      /Simulated lost response/,
    );
    await assert.rejects(
      () =>
        useCase.execute({
          episodeWordSet,
          genre: 'travel-leisure',
          seriesId: series.id,
        }),
      /Simulated lost response/,
    );

    assert.equal(requestIds.length, 2);
    assert.equal(requestIds[1], requestIds[0]);
  });
});

// createMemoryGenerationRequestStore models durable episode retry identity in tests.
function createMemoryGenerationRequestStore(): GenerationRequestStore {
  // requests maps each episode slot to its unfinished logical request id.
  const requests: Map<string, string> = new Map<string, string>();

  return {
    get: async (operationKey: string): Promise<string | undefined> =>
      requests.get(operationKey),
    save: async (operationKey: string, requestId: string): Promise<void> => {
      requests.set(operationKey, requestId);
    },
    remove: async (operationKey: string, requestId: string): Promise<void> => {
      if (requests.get(operationKey) === requestId) {
        requests.delete(operationKey);
      }
    },
  };
}

// createStore builds the local series boundary for episode generation tests.
function createStore(
  episodes: readonly Episode[],
  savedEpisodes: Episode[],
): LocalSeriesStore {
  return {
    getSeriesSetupDraft: async () => undefined,
    saveSeriesSetupDraft: async () => undefined,
    deleteSeriesSetupDraft: async () => undefined,
    getPreferences: async () => undefined,
    readBootstrapPreferences: async () => ({
      preferences: undefined,
      recovered: false,
    }),
    savePreferences: async () => undefined,
    listSeries: async () => [series],
    getSeries: async () => series,
    saveSeries: async () => undefined,
    deleteSeries: async () => undefined,
    listEpisodes: async () => episodes,
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
}

// createEpisode returns the latest local completion state under test.
function createEpisode(isComplete: boolean): Episode {
  return {
    id: 'episode:series:test:1',
    seriesId: series.id,
    orderIndex: 1,
    sceneText: 'Mira found a silver gate.',
    sentences: ['Mira found a silver gate.'],
    sentenceFrames: [
      { kind: 'narration', text: 'Mira found a silver gate.' },
    ],
    storyWordIds: [],
    annotations: [],
    interactions: [],
    isComplete,
    summaryUpdate: 'Mira found a silver gate.',
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: false,
      pendingOperationId: 'episode:test',
    },
  };
}
