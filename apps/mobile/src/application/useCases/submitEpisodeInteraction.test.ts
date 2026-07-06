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
    partOfSpeech: 'adjective',
    level: 'A2',
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
        assert.equal(request.participationMode, 'director');
        assert.equal(request.compactSeriesMemory.participationMode, 'director');
        assert.equal(request.interactionCount, 1);
        assert.equal(request.previousDecisions.length, 0);
        assert.deepEqual(request.selectedStoryWords.map((word) => word.id), [
          'word:careful',
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
});
