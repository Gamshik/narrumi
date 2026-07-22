import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  Clock,
  LocalSeriesStore,
  SeriesSetupModerationGateway,
} from '@application/ports';
import type { Episode, Series, SeriesMemory } from '@domain/index';

import { createUpdateSeriesSetup } from './updateSeriesSetup';

// timestamp keeps setup update fixtures deterministic.
const timestamp = '2026-06-10T10:00:00.000Z';

// characterProfiles pin dialogue labels separately from AI-facing descriptions.
const characterProfiles = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A curious learner investigating the hidden door.',
  },
] as const;

// memory is the editable pre-episode compact setup.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira finds a hidden door.',
  genre: 'short-fiction',
  tone: 'Calm detective',
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

// series is the local story root edited before first episode generation.
const series: Series = {
  id: 'series:test',
  title: 'The Door',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: memory.tone,
  premise: memory.premise,
  participationMode: 'director',
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

describe('updateSeriesSetup', () => {
  it('updates setup before the first episode exists', async () => {
    // savedSeries captures the updated local story root.
    const savedSeries: Series[] = [];
    // savedMemories captures the updated compact memory.
    const savedMemories: SeriesMemory[] = [];
    // moderationGateway verifies creative anchors cross the manual-save trust boundary.
    const moderationGateway: SeriesSetupModerationGateway = {
      validateSeriesSetup: async (request) => {
        assert.equal(
          request.creativeBrief?.idea,
          'A mysterious map found in a library book.',
        );
        assert.equal(request.creativeBrief?.preferredCastSize, 2);
      },
    };
    const useCase = createUpdateSeriesSetup(
      createStore([], savedSeries, savedMemories),
      createClock(),
      moderationGateway,
    );

    const result = await useCase.execute({
      seriesId: series.id,
      title: 'Library Map',
      genre: 'travel-leisure',
      cefrLevel: 'A2',
      tone: 'Light adventure',
      premise: 'Mira follows a map across a quiet station.',
      participationMode: 'character',
      mainCharacters: ['Mira', 'Leo'],
      userRole: 'mira',
      creativeBrief: {
        idea: 'A mysterious map found in a library book.',
        worldAndSetting: 'A quiet railway station',
        backstory: '',
        storyDriver: 'Find the place shown on the map.',
        mustInclude: 'A locked waiting room',
        avoid: 'Violence',
        preferredCastSize: 2,
        draftStrategy: 'refine',
      },
      setupDraftMeta: { aiGeneratedFields: ['title', 'premise'] },
    });

    assert.equal(result.series.title, 'Library Map');
    assert.equal(result.series.participationMode, 'character');
    assert.equal(result.series.userRole, 'Mira');
    assert.equal(result.series.creativeBrief.preferredCastSize, 2);
    assert.deepEqual(result.series.setupDraftMeta.aiGeneratedFields, [
      'title',
      'premise',
    ]);
    assert.equal(savedSeries.length, 1);
    assert.equal(savedMemories[0]?.participationMode, 'character');
  });

  it('rejects setup edits after the first episode exists', async () => {
    const useCase = createUpdateSeriesSetup(
      createStore([createEpisode()], [], []),
      createClock(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          seriesId: series.id,
          title: 'Library Map',
          genre: 'travel-leisure',
          cefrLevel: 'A2',
          tone: 'Light adventure',
          premise: 'Mira follows a map across a quiet station.',
          participationMode: 'director',
          mainCharacters: ['Mira'],
        }),
      /read-only/,
    );
  });
});

// createClock provides deterministic timestamps for local-first updates.
function createClock(): Clock {
  return {
    now: () => new Date(timestamp),
  };
}

// createStore returns a focused LocalSeriesStore test double for setup updates.
function createStore(
  episodes: readonly Episode[],
  savedSeries: Series[],
  savedMemories: SeriesMemory[],
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
    saveSeries: async (value) => {
      savedSeries.push(value);
    },
    deleteSeries: async () => undefined,
    listEpisodes: async () => episodes,
    getEpisode: async () => undefined,
    saveEpisode: async () => undefined,
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
}

// createEpisode returns one existing generated episode for the read-only guard.
function createEpisode(): Episode {
  return {
    id: 'episode:test',
    seriesId: series.id,
    orderIndex: 1,
    sceneText: 'Mira found a door.',
    sentences: ['Mira found a door.'],
    sentenceFrames: [{ kind: 'narration', text: 'Mira found a door.' }],
    storyWordIds: [],
    annotations: [],
    interactions: [],
    isComplete: false,
    summaryUpdate: 'Mira found a door.',
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: false,
      pendingOperationId: 'episode:initial',
    },
  };
}
