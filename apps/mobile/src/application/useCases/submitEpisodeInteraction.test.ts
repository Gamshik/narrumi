import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  InteractionGateway,
  LocalSeriesStore,
  NetworkStatus,
} from '@application/ports';
import type { Episode, Series, SeriesMemory, VocabularyItem } from '@domain/index';

import { createSubmitEpisodeInteraction } from './submitEpisodeInteraction';

// timestamp is the deterministic local write time used by the regression test.
const timestamp = '2026-06-06T10:00:00.000Z';

// characterProfiles pin dialogue labels separately from AI-facing descriptions.
const characterProfiles = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A careful learner exploring the hidden door.',
  },
] as const;

// memory is the compact continuity record required by the AI boundary.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira finds a hidden door.',
  genre: 'short-fiction',
  tone: 'mysterious but friendly',
  participationMode: 'director',
  mainCharacters: ['Mira'],
  characterProfiles,
  knownFacts: [],
  openQuestions: ['What is behind the door?'],
  importantObjectsOrLocations: ['blue door'],
  recurringStoryWordIds: [],
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'memory:initial',
  },
};

// series is the local continuity root used to build the interaction request.
const series: Series = {
  id: 'series:test',
  title: 'The Blue Door',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: 'mysterious but friendly',
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

// episode is an unfinished local unit with its first learner decision.
const episode: Episode = {
  id: 'episode:test',
  seriesId: series.id,
  orderIndex: 1,
  cefrLevel: 'A2',
  genre: 'cozy-mystery',
  title: 'The Hidden Door',
  sceneText: 'Mira found a blue door.',
  sentences: ['Mira found a blue door.'],
  sentenceFrames: [
    {
      kind: 'narration',
      text: 'Mira found a blue door.',
    },
  ],
  storyWordIds: ['word:careful'],
  annotations: [
    {
      wordId: 'word:careful',
      surfaceText: 'careful',
      translation: 'осторожный',
      sentenceIndex: 0,
    },
  ],
  interactions: [
    {
      id: 'interaction:episode:test:1',
      episodeId: 'episode:test',
      kind: 'choice',
      prompt: 'What should Mira do?',
      choices: [
        { id: 'open', label: 'Open the door carefully' },
        { id: 'wait', label: 'Wait and listen' },
      ],
      sentenceEndIndex: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  isComplete: false,
  summaryUpdate: 'Mira found a hidden blue door.',
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'episode:initial',
  },
};

// vocabulary resolves planned Episode Words for continuation prompts.
const vocabulary: readonly VocabularyItem[] = [
  {
    id: 'word:careful',
    word: 'careful',
    translation: 'осторожный',
    partOfSpeech: 'adjective',
    level: 'B1',
    examples: ['Be careful.'],
    phonetics: {},
  },
];

describe('submitEpisodeInteraction', () => {
  it('appends the next decision to the same locally saved episode', async () => {
    // savedEpisodes captures the local-first draft and finalized episode writes.
    const savedEpisodes: Episode[] = [];
    // savedMemories captures the compact memory update after AI validation.
    const savedMemories: SeriesMemory[] = [];
    // store implements only deterministic in-memory behavior needed by this use case.
    const store: LocalSeriesStore = {
      getSeriesSetupDraft: async () => undefined,
      saveSeriesSetupDraft: async () => undefined,
      deleteSeriesSetupDraft: async () => undefined,
      getPreferences: async () => undefined,
      readBootstrapPreferences: async () => ({ preferences: undefined, recovered: false }),
      savePreferences: async () => undefined,
      listSeries: async () => [series],
      getSeries: async () => series,
      saveSeries: async () => undefined,
      deleteSeries: async () => undefined,
      listEpisodes: async () => [episode],
      getEpisode: async () => episode,
      saveEpisode: async (value) => {
        savedEpisodes.push(value);
      },
      deleteEpisode: async () => undefined,
      getSeriesMemory: async () => memory,
      saveSeriesMemory: async (value) => {
        savedMemories.push(value);
      },
      listWordSets: async () => [],
      saveWordSet: async () => undefined,
      listLearningSignals: async () => [],
      saveLearningSignal: async () => undefined,
      getSyncMetadata: async () => undefined,
      saveSyncMetadata: async () => undefined,
    };
    // catalog resolves selected Story Words before calling the Edge boundary.
    const catalog = {
      getById: async (id: string) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    // networkStatus keeps the server-backed interaction path available.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gateway returns a valid continuing turn with another learner decision.
    const gateway: InteractionGateway = {
      submitInteraction: async (request) => {
        assert.equal(request.seriesTitle, 'The Blue Door');
        assert.equal(request.cefrLevel, 'A2');
        assert.equal(request.genre, 'cozy-mystery');
        assert.equal(request.participationMode, 'director');
        assert.equal(request.compactSeriesMemory.participationMode, 'director');
        assert.equal(request.interactionCount, 1);
        assert.equal(request.previousDecisions.length, 0);
        assert.equal(request.selectedChoiceLabel, 'Open the door carefully');
        assert.equal(request.userReply, undefined);
        assert.deepEqual(request.selectedStoryWords.map((word) => word.id), [
          'word:careful',
        ]);
        assert.deepEqual(request.selectedStoryWords[0]?.usageExamples, [
          'Be careful.',
        ]);
        assert.deepEqual(request.encounteredStoryWordIds, ['word:careful']);

        return {
          feedback: 'Good choice. "Open the door carefully" sounds natural.',
          continuationText:
            'Mira opened the door and found a narrow blue passage.',
          continuationSentences: [
            'Mira opened the door and found a narrow blue passage.',
          ],
          continuationSentenceFrames: [
            {
              kind: 'narration',
              text: 'Mira opened the door and found a narrow blue passage.',
            },
          ],
          continuationAnnotations: [],
          isEpisodeComplete: false,
          nextInteraction: {
            kind: 'choice',
            prompt: 'What should Mira inspect?',
            choices: [
              { id: 'map', label: 'Study the old map' },
              { id: 'wall', label: 'Check the marked wall' },
            ],
          },
          summaryUpdate:
            'Mira opened the hidden door and found a blue passage.',
          memoryUpdate: {
            knownFacts: ['The door leads to a blue passage.'],
            openQuestions: ['Where does the passage lead?'],
            importantObjectsOrLocations: ['blue passage'],
            lastEpisodeSummary:
              'Mira opened the hidden door and found a blue passage.',
            unresolvedCliffhanger:
              'A faded map pointed deeper into the passage.',
            recurringStoryWordIds: [],
          },
        };
      },
    };
    const useCase = createSubmitEpisodeInteraction(
      store,
      catalog,
      networkStatus,
      gateway,
      { now: () => new Date(timestamp) },
    );

    const result = await useCase.execute({
      episodeId: episode.id,
      interactionId: episode.interactions[0]!.id,
      choiceId: 'open',
    });

    assert.equal(savedEpisodes.length, 2);
    assert.equal(savedEpisodes[0]?.interactions[0]?.userReply, 'Open the door carefully');
    assert.equal(result.episode.id, episode.id);
    assert.equal(result.episode.interactions.length, 2);
    assert.equal(result.episode.interactions[0]?.feedback?.startsWith('Good choice'), true);
    assert.equal(result.episode.interactions[1]?.sentenceEndIndex, 2);
    assert.equal(result.episode.isComplete, false);
    assert.equal(savedMemories.length, 1);
  });

  it('sends only the latest ten previous decisions to the AI boundary', async () => {
    // longEpisode simulates an overlong in-progress episode from older prompts.
    const longEpisode: Episode = {
      ...episode,
      interactions: [
        ...Array.from({ length: 13 }, (_, index) => ({
          id: `interaction:episode:test:${index + 1}`,
          episodeId: episode.id,
          kind: 'choice' as const,
          prompt: `Previous prompt ${index + 1}`,
          choices: [
            { id: `choice:${index + 1}:a`, label: `Choice ${index + 1}A` },
            { id: `choice:${index + 1}:b`, label: `Choice ${index + 1}B` },
          ],
          sentenceEndIndex: 1,
          selectedChoiceId: `choice:${index + 1}:a`,
          userReply: `Choice ${index + 1}A`,
          feedback: `Feedback ${index + 1}`,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
        {
          id: 'interaction:episode:test:14',
          episodeId: episode.id,
          kind: 'choice',
          prompt: 'Final prompt',
          choices: [
            { id: 'finish', label: 'Finish the episode' },
            { id: 'continue', label: 'Keep exploring' },
          ],
          sentenceEndIndex: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    };
    // savedEpisodes captures the local draft and completed episode writes.
    const savedEpisodes: Episode[] = [];
    // store returns the long episode while keeping unrelated ports inert.
    const store: LocalSeriesStore = {
      getSeriesSetupDraft: async () => undefined,
      saveSeriesSetupDraft: async () => undefined,
      deleteSeriesSetupDraft: async () => undefined,
      getPreferences: async () => undefined,
      readBootstrapPreferences: async () => ({ preferences: undefined, recovered: false }),
      savePreferences: async () => undefined,
      listSeries: async () => [series],
      getSeries: async () => series,
      saveSeries: async () => undefined,
      deleteSeries: async () => undefined,
      listEpisodes: async () => [longEpisode],
      getEpisode: async () => longEpisode,
      saveEpisode: async (value) => {
        savedEpisodes.push(value);
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
    // catalog resolves selected Story Words before calling the Edge boundary.
    const catalog = {
      getById: async (id: string) => vocabulary.find((word) => word.id === id),
      list: async () => vocabulary,
    };
    // networkStatus keeps the submit flow online for the use case.
    const networkStatus: NetworkStatus = {
      getCurrentState: async () => ({ isOnline: true }),
    };
    // gateway asserts the request is bounded while preserving total turn count.
    const gateway: InteractionGateway = {
      submitInteraction: async (request) => {
        assert.equal(request.seriesTitle, 'The Blue Door');
        assert.equal(request.participationMode, 'director');
        assert.equal(request.interactionCount, 14);
        assert.equal(request.previousDecisions.length, 10);
        assert.equal(request.previousDecisions[0]?.prompt, 'Previous prompt 4');

        return {
          feedback: 'Good choice. That answer sounds natural.',
          continuationText: 'Mira finished the passage and found a new map.',
          continuationSentences: [
            'Mira finished the passage and found a new map.',
          ],
          continuationSentenceFrames: [
            {
              kind: 'narration',
              text: 'Mira finished the passage and found a new map.',
            },
          ],
          continuationAnnotations: [],
          isEpisodeComplete: true,
          cliffhanger: 'The map pointed to another hidden shelf.',
          summaryUpdate:
            'Mira finished the passage and found a new library map.',
          memoryUpdate: {
            knownFacts: ['Mira found a new library map.'],
            openQuestions: ['Where does the map point?'],
            importantObjectsOrLocations: ['library map'],
            lastEpisodeSummary:
              'Mira finished the passage and found a new library map.',
            unresolvedCliffhanger:
              'The map pointed to another hidden shelf.',
            recurringStoryWordIds: [],
          },
        };
      },
    };
    const useCase = createSubmitEpisodeInteraction(
      store,
      catalog,
      networkStatus,
      gateway,
      { now: () => new Date(timestamp) },
    );

    const result = await useCase.execute({
      episodeId: longEpisode.id,
      interactionId: 'interaction:episode:test:14',
      choiceId: 'finish',
    });

    assert.equal(result.episode.isComplete, true);
    assert.equal(savedEpisodes.length, 2);
  });

  it('persists the pending answer before loading continuation vocabulary', async () => {
    // savedEpisodes captures the durable marker used when the reader remounts.
    const savedEpisodes: Episode[] = [];
    // releaseVocabulary resolves the deliberately paused local catalog read.
    let releaseVocabulary:
      | ((words: readonly VocabularyItem[]) => void)
      | undefined;
    // vocabularyPromise keeps request preparation active after the draft write.
    const vocabularyPromise: Promise<readonly VocabularyItem[]> =
      new Promise<readonly VocabularyItem[]>((resolve): void => {
        releaseVocabulary = resolve;
      });
    const useCase = createSubmitEpisodeInteraction(
      createTestStore(episode, (savedEpisode: Episode): void => {
        savedEpisodes.push(savedEpisode);
      }),
      {
        getById: async (id: string) =>
          vocabulary.find((word) => word.id === id),
        list: (): Promise<readonly VocabularyItem[]> => vocabularyPromise,
      },
      createOnlineNetworkStatus(),
      {
        submitInteraction: (): Promise<never> =>
          new Promise<never>((): void => undefined),
      },
      { now: (): Date => new Date(timestamp) },
    );

    void useCase.execute({
      episodeId: episode.id,
      interactionId: episode.interactions[0]!.id,
      choiceId: 'open',
    });
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });

    assert.equal(savedEpisodes.length, 1);
    assert.equal(savedEpisodes[0]?.interactions[0]?.selectedChoiceId, 'open');
    releaseVocabulary?.(vocabulary);
  });

  it('shares one in-flight continuation when the reader remounts', async () => {
    // GatewayResult is the validated continuation contract returned by the AI boundary.
    type GatewayResult = Awaited<
      ReturnType<InteractionGateway['submitInteraction']>
    >;
    // pendingGatewayResult keeps the original request open while the reader joins it again.
    const pendingGatewayResult: Promise<GatewayResult> =
      new Promise<GatewayResult>((): void => undefined);
    // gatewayCallCount proves remount recovery does not duplicate the Edge Function call.
    let gatewayCallCount: number = 0;
    const gateway: InteractionGateway = {
      submitInteraction: (): Promise<GatewayResult> => {
        gatewayCallCount += 1;

        return pendingGatewayResult;
      },
    };
    const useCase = createSubmitEpisodeInteraction(
      createTestStore(episode),
      createTestCatalog(),
      createOnlineNetworkStatus(),
      gateway,
      { now: (): Date => new Date(timestamp) },
    );
    // input identifies the same durable learner answer from both reader mounts.
    const input = {
      episodeId: episode.id,
      interactionId: episode.interactions[0]!.id,
      choiceId: 'open',
    } as const;

    const originalRequest = useCase.execute(input);
    const resumedRequest = useCase.execute(input);

    assert.equal(resumedRequest, originalRequest);
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });
    assert.equal(gatewayCallCount, 1);
  });

  it('returns an interaction that finished during reader restoration', async () => {
    // answeredEpisode mirrors a request that persisted its result before retry began.
    const answeredEpisode: Episode = {
      ...episode,
      interactions: episode.interactions.map((interaction) => ({
        ...interaction,
        selectedChoiceId: 'open',
        userReply: 'Open the door carefully',
        feedback: 'Good choice.',
      })),
    };
    // gatewayCallCount remains zero when the durable result already exists.
    let gatewayCallCount: number = 0;
    const useCase = createSubmitEpisodeInteraction(
      createTestStore(answeredEpisode),
      createTestCatalog(),
      createOnlineNetworkStatus(),
      {
        submitInteraction: async (): Promise<never> => {
          gatewayCallCount += 1;
          throw new Error('The completed interaction must not be submitted again.');
        },
      },
      { now: (): Date => new Date(timestamp) },
    );

    const result = await useCase.execute({
      episodeId: answeredEpisode.id,
      interactionId: answeredEpisode.interactions[0]!.id,
      choiceId: 'open',
    });

    assert.equal(result.episode, answeredEpisode);
    assert.equal(gatewayCallCount, 0);
  });
});

// createTestStore returns one deterministic episode with inert unrelated persistence ports.
function createTestStore(
  episodeValue: Episode,
  onSaveEpisode?: (episode: Episode) => void,
): LocalSeriesStore {
  return {
    getSeriesSetupDraft: async () => undefined,
    saveSeriesSetupDraft: async () => undefined,
    deleteSeriesSetupDraft: async () => undefined,
    getPreferences: async () => undefined,
    readBootstrapPreferences: async () => ({ preferences: undefined, recovered: false }),
    savePreferences: async () => undefined,
    listSeries: async () => [series],
    getSeries: async () => series,
    saveSeries: async () => undefined,
    deleteSeries: async () => undefined,
    listEpisodes: async () => [episodeValue],
    getEpisode: async () => episodeValue,
    saveEpisode: async (savedEpisode) => {
      onSaveEpisode?.(savedEpisode);
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

// createTestCatalog resolves the single bundled Story Word used by the fixtures.
function createTestCatalog(): {
  // getById resolves an optional vocabulary item by stable identifier.
  readonly getById: (id: string) => Promise<VocabularyItem | undefined>;
  // list returns the complete deterministic vocabulary fixture.
  readonly list: () => Promise<readonly VocabularyItem[]>;
} {
  return {
    getById: async (id: string) => vocabulary.find((word) => word.id === id),
    list: async () => vocabulary,
  };
}

// createOnlineNetworkStatus keeps continuation tests on the server-backed path.
function createOnlineNetworkStatus(): NetworkStatus {
  return {
    getCurrentState: async () => ({ isOnline: true }),
  };
}
