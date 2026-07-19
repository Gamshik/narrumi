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
  it('persists creative anchors and setup provenance on the series root', async () => {
    // savedSeries captures the locally authoritative creative setup.
    const savedSeries: Series[] = [];
    // savedMemory confirms creative anchors do not expand compact episode context.
    const savedMemory: SeriesMemory[] = [];
    const createSeries = createCreateSeries(
      createMemoryStore(savedSeries, savedMemory),
      { now: () => new Date('2026-06-10T10:00:00.000Z') },
      {
        validateSeriesSetup: async (request) => {
          assert.equal(
            request.creativeBrief?.idea,
            'A message arrives from a pilot missing for ten years.',
          );
          assert.equal(request.creativeBrief?.draftStrategy, 'refine');
        },
      },
    );

    const result = await createSeries.execute({
      title: 'The Last Flight',
      genre: 'short-fiction',
      cefrLevel: 'B1',
      tone: 'Quiet mystery',
      premise: 'A new airport worker receives an impossible message.',
      participationMode: 'director',
      mainCharacters: ['Mira', 'Jon'],
      creativeBrief: {
        idea: 'A message arrives from a pilot missing for ten years.',
        worldAndSetting: 'A small regional airport at night',
        backstory: 'The airport never solved the old disappearance.',
        storyDriver: 'Find out who sent the message.',
        mustInclude: 'A broken radio',
        avoid: 'Graphic violence',
        preferredCastSize: 2,
        draftStrategy: 'refine',
      },
      setupDraftMeta: {
        aiGeneratedFields: ['title', 'premise', 'characterProfiles'],
      },
    });

    assert.equal(result.series.creativeBrief.draftStrategy, 'refine');
    assert.equal(result.series.creativeBrief.preferredCastSize, 2);
    assert.deepEqual(result.series.setupDraftMeta.aiGeneratedFields, [
      'title',
      'premise',
      'characterProfiles',
    ]);
    assert.equal(savedSeries.length, 1);
    assert.equal('creativeBrief' in savedMemory[0]!, false);
  });

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
        assert.equal(request.participationMode, 'director');
        assert.equal(request.mainCharacters[0], 'Mira');
        assert.equal(request.creativeBrief?.draftStrategy, 'fill-missing');
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
          premise: 'Mira finds a strange school map.',
          participationMode: 'director',
          mainCharacters: ['Mira'],
        }),
      /blocked content/,
    );

    assert.equal(savedSeries.length, 0);
    assert.equal(savedMemory.length, 0);
  });

  it('requires a learner role for character mode', async () => {
    // savedSeries confirms validation stops before persistence.
    const savedSeries: Series[] = [];
    // savedMemory confirms validation stops before memory persistence.
    const savedMemory: SeriesMemory[] = [];
    const createSeries = createCreateSeries(
      createMemoryStore(savedSeries, savedMemory),
      { now: () => new Date('2026-06-10T10:00:00.000Z') },
    );

    await assert.rejects(
      () =>
        createSeries.execute({
          title: 'The Door',
          genre: 'short-fiction',
          cefrLevel: 'B1',
          tone: 'Calm detective',
          premise: 'Mira finds a quiet blue door.',
          participationMode: 'character',
          mainCharacters: ['Mira'],
        }),
      /role is required/,
    );

    assert.equal(savedSeries.length, 0);
    assert.equal(savedMemory.length, 0);
  });

  it('requires complete text setup before local persistence', async () => {
    // savedSeries confirms required-field validation stops before persistence.
    const savedSeries: Series[] = [];
    // savedMemory confirms required-field validation stops before memory persistence.
    const savedMemory: SeriesMemory[] = [];
    const createSeries = createCreateSeries(
      createMemoryStore(savedSeries, savedMemory),
      { now: () => new Date('2026-06-10T10:00:00.000Z') },
    );

    await assert.rejects(
      () =>
        createSeries.execute({
          title: 'The Door',
          genre: 'short-fiction',
          cefrLevel: 'B1',
          tone: 'Calm detective',
          premise: '',
          participationMode: 'director',
          mainCharacters: [],
        }),
      /premise is required/,
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
    getSeriesSetupDraft: async () => undefined,
    saveSeriesSetupDraft: async () => undefined,
    deleteSeriesSetupDraft: async () => undefined,
    getPreferences: async () => undefined,
    readBootstrapPreferences: async () => ({ preferences: undefined, recovered: false }),
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
