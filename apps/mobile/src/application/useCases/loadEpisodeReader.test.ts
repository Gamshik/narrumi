import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LocalSeriesStore } from '@application/ports';
import type { Episode } from '@domain/index';

import { createLoadEpisodeReader } from './loadEpisodeReader';

// timestamp is the deterministic version for the reader lookup fixture.
const timestamp = '2026-07-16T12:00:00.000Z';

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
      getSeries: async () => undefined,
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
  });
});
