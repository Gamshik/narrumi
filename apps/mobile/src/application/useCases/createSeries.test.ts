import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  Clock,
  LocalSeriesStore,
  SeriesSetupModerationGateway,
} from '@application/ports';
import type { Series, SeriesMemory } from '@domain/index';

import { createCreateSeries } from './createSeries';

describe('createSeries', () => {
  it('validates user setup fields before saving a local series', async () => {
    // savedSeries captures whether local persistence happened after moderation.
    const savedSeries: Series[] = [];
    // savedMemory captures whether memory persistence happened after moderation.
    const savedMemory: SeriesMemory[] = [];
    // store implements only the persistence calls used by createSeries.
    const store = createMemoryStore(savedSeries, savedMemory);
    // clock keeps local ids deterministic when persistence is allowed.
    const clock: Clock = {
      now: () => new Date('2026-06-10T10:00:00.000Z'),
    };
    // moderationGateway rejects the setup before any local writes can happen.
    const moderationGateway: SeriesSetupModerationGateway = {
      validateSeriesSetup: async (request) => {
        assert.equal(request.title, 'Bomb, garry potter');
        assert.equal(request.mainCharacters[0], 'Mira');
        throw new Error('Series setup matched blocked content rules.');
      },
    };
    const createSeries = createCreateSeries(
      store,
      clock,
      moderationGateway,
    );

    await assert.rejects(
      () =>
        createSeries.execute({
          title: 'Bomb, garry potter',
          genre: 'short-fiction',
          cefrLevel: 'A2',
          tone: 'Light adventure',
          premise: '',
          mainCharacters: ['Mira'],
        }),
      /blocked content/,
    );

    assert.equal(savedSeries.length, 0);
    assert.equal(savedMemory.length, 0);
  });
});

// createMemoryStore returns a focused LocalSeriesStore test double for createSeries.
function createMemoryStore(
  savedSeries: Series[],
  savedMemory: SeriesMemory[],
): LocalSeriesStore {
  return {
    getPreferences: async () => undefined,
    savePreferences: async () => undefined,
    listSeries: async () => [],
    getSeries: async () => undefined,
    saveSeries: async (series) => {
      savedSeries.push(series);
    },
    deleteSeries: async () => undefined,
    listEpisodes: async () => [],
    getEpisode: async () => undefined,
    saveEpisode: async () => undefined,
    deleteEpisode: async () => undefined,
    getSeriesMemory: async () => undefined,
    saveSeriesMemory: async (memory) => {
      savedMemory.push(memory);
    },
    listWordSets: async () => [],
    saveWordSet: async () => undefined,
    listLearningSignals: async () => [],
    saveLearningSignal: async () => undefined,
    getSyncMetadata: async () => undefined,
    saveSyncMetadata: async () => undefined,
  };
}
