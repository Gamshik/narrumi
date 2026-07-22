import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore } from '@application/ports';
import type { Episode, Series, SeriesMemory } from '@domain/index';

import { createLoadEpisodeReader } from './loadEpisodeReader';

// timestamp is the deterministic version for the reader lookup fixture.
const timestamp = '2026-07-16T12:00:00.000Z';

// memory keeps the Reader fixture aligned with the local aggregate contract.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira opens doors in a quiet archive.',
  genre: 'short-fiction',
  tone: 'Quiet mystery',
  participationMode: 'character',
  mainCharacters: ['Mira'],
  characterProfiles: [
    {
      id: 'character:mira',
      name: 'Mira',
      description: 'A careful archive researcher.',
    },
  ],
  userRole: 'Mira',
  knownFacts: [],
  openQuestions: [],
  importantObjectsOrLocations: [],
  recurringStoryWordIds: [],
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'memory:test',
  },
};

// series supplies the canonical learner character required by dialogue presentation.
const series: Series = {
  id: memory.seriesId,
  title: 'Archive Doors',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: memory.tone,
  premise: memory.premise,
  participationMode: memory.participationMode,
  mainCharacters: memory.mainCharacters,
  characterProfiles: memory.characterProfiles,
  userRole: 'Mira',
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
    pendingOperationId: 'series:test',
  },
};

// episode keeps a legacy URL-sensitive id to prove routing no longer depends on it.
const episode: Episode = {
  id: 'episode:series:test:generation:episode%3Aseries:test:123:1',
  seriesId: 'series:test',
  orderIndex: 2,
  sceneText: 'Mira opened the second door.',
  sentences: ['Mira opened the second door.'],
  sentenceFrames: [
    { kind: 'narration', text: 'Mira opened the second door.' },
  ],
  storyWordIds: [],
  annotations: [],
  interactions: [],
  isComplete: false,
  summaryUpdate: 'Mira opened the second door.',
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: {
    isDirty: false,
    pendingOperationId: 'episode:test',
  },
};

describe('loadEpisodeReader', () => {
  it('loads an episode by series and order without routing its internal id', async () => {
    // store returns the legacy episode only through its ordered series collection.
    const store: LocalSeriesStore = {
      getSeriesSetupDraft: async () => undefined,
      saveSeriesSetupDraft: async () => undefined,
      deleteSeriesSetupDraft: async () => undefined,
      getPreferences: async () => undefined,
      readBootstrapPreferences: async () => ({
        preferences: undefined,
        recovered: false,
      }),
      savePreferences: async () => undefined,
      listSeries: async () => [],
      getSeries: async (seriesId) =>
        seriesId === series.id ? series : undefined,
      saveSeries: async () => undefined,
      deleteSeries: async () => undefined,
      listEpisodes: async (seriesId) =>
        seriesId === episode.seriesId ? [episode] : [],
      getEpisode: async () => undefined,
      saveEpisode: async () => undefined,
      deleteEpisode: async () => undefined,
      getSeriesMemory: async () => undefined,
      saveSeriesMemory: async () => undefined,
      listWordSets: async () => [],
      saveWordSet: async () => undefined,
      listLearningSignals: async () => [],
      saveLearningSignal: async () => undefined,
      getSyncMetadata: async () => undefined,
      saveSyncMetadata: async () => undefined,
    };
    const useCase = createLoadEpisodeReader(store);

    const result = await useCase.execute({
      seriesId: episode.seriesId,
      orderIndex: episode.orderIndex,
    });

    assert.equal(result.episode.id, episode.id);
    assert.equal(result.series.userRole, 'Mira');
  });
});
