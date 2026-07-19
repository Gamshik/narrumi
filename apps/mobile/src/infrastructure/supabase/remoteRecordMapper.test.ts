import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Series, SeriesMemory } from '@domain/index';

import { parseRemoteSnapshot, serializeSyncRecord } from './remoteRecordMapper';

// ownerId is the deterministic authenticated user used by mapper tests.
const ownerId = '00000000-0000-4000-8000-000000000001';
// timestamp is a valid shared client and server version.
const timestamp = '2026-07-17T10:00:00.000Z';
// memory is the bounded episode context related to the series fixture.
const memory: SeriesMemory = {
  id: 'series:test',
  seriesId: 'series:test',
  premise: 'Mira receives an impossible radio message.',
  genre: 'short-fiction',
  tone: 'Quiet mystery',
  participationMode: 'director',
  mainCharacters: ['Mira'],
  characterProfiles: [
    {
      id: 'character:mira',
      name: 'Mira',
      description: 'A new airport worker.',
    },
  ],
  knownFacts: [],
  openQuestions: [],
  importantObjectsOrLocations: [],
  recurringStoryWordIds: [],
  updatedAt: timestamp,
  sync: { isDirty: true, pendingOperationId: 'memory:write' },
};
// series is the story-root fixture that owns creative setup data.
const series: Series = {
  id: 'series:test',
  title: 'The Last Flight',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: memory.tone,
  premise: memory.premise,
  participationMode: 'director',
  mainCharacters: memory.mainCharacters,
  characterProfiles: memory.characterProfiles,
  creativeBrief: {
    idea: 'A pilot missing for ten years sends a message.',
    worldAndSetting: 'A small airport at night',
    backstory: '',
    storyDriver: 'Trace the radio signal.',
    mustInclude: 'A broken radio',
    avoid: 'Graphic violence',
    preferredCastSize: 2,
    draftStrategy: 'refine',
  },
  setupDraftMeta: { aiGeneratedFields: ['title', 'premise'] },
  memory,
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: { isDirty: true, pendingOperationId: 'series:write' },
};

describe('remoteRecordMapper series creative setup', () => {
  it('serializes creative setup into dedicated JSON columns', () => {
    const write = serializeSyncRecord(ownerId, { kind: 'series', value: series });

    assert.equal(write.table, 'series');
    assert.deepEqual(write.row.creative_brief, series.creativeBrief);
    assert.deepEqual(write.row.setup_draft_meta, series.setupDraftMeta);
    assert.equal('creative_brief' in serializeSyncRecord(ownerId, {
      kind: 'seriesMemory',
      value: memory,
    }).row, false);
  });

  it('normalizes legacy remote rows without creative setup columns', () => {
    const snapshot = parseRemoteSnapshot(ownerId, {
      series: [createLegacySeriesRow()],
      seriesMemories: [createMemoryRow()],
      episodes: [],
      wordSets: [],
      learningSignals: [],
      preferences: [],
    });

    assert.deepEqual(snapshot.series[0]?.creativeBrief, {
      idea: '',
      worldAndSetting: '',
      backstory: '',
      storyDriver: '',
      mustInclude: '',
      avoid: '',
      draftStrategy: 'fill-missing',
    });
    assert.deepEqual(snapshot.series[0]?.setupDraftMeta, {
      aiGeneratedFields: [],
    });
  });

  it('does not turn legacy remote AI freedom into replacement permission', () => {
    const legacyRow = {
      ...createLegacySeriesRow(),
      creative_brief: {
        idea: 'A signal arrives from an empty station.',
        worldAndSetting: '',
        backstory: '',
        storyDriver: '',
        mustInclude: '',
        avoid: '',
        aiFreedom: 'surprise',
      },
    };
    const snapshot = parseRemoteSnapshot(ownerId, {
      series: [legacyRow],
      seriesMemories: [createMemoryRow()],
      episodes: [],
      wordSets: [],
      learningSignals: [],
      preferences: [],
    });

    assert.equal(
      snapshot.series[0]?.creativeBrief.draftStrategy,
      'fill-missing',
    );
  });
});

// createLegacySeriesRow omits the new JSON columns to exercise compatibility defaults.
function createLegacySeriesRow(): Record<string, unknown> {
  return {
    id: series.id,
    user_id: ownerId,
    title: series.title,
    genre: series.genre,
    cefr_level: series.cefrLevel,
    tone: series.tone,
    premise: series.premise,
    participation_mode: series.participationMode,
    main_characters: series.mainCharacters,
    character_profiles: series.characterProfiles,
    user_role: null,
    created_at: timestamp,
    client_updated_at: timestamp,
    last_operation_id: 'series:remote',
    server_updated_at: timestamp,
  };
}

// createMemoryRow returns the required related compact-memory database row.
function createMemoryRow(): Record<string, unknown> {
  return {
    id: memory.id,
    series_id: memory.seriesId,
    user_id: ownerId,
    premise: memory.premise,
    genre: memory.genre,
    tone: memory.tone,
    participation_mode: memory.participationMode,
    main_characters: memory.mainCharacters,
    character_profiles: memory.characterProfiles,
    user_role: null,
    current_conflict: null,
    known_facts: [],
    open_questions: [],
    important_objects_or_locations: [],
    last_episode_summary: null,
    unresolved_cliffhanger: null,
    recurring_story_word_ids: [],
    client_updated_at: timestamp,
    last_operation_id: 'memory:remote',
    server_updated_at: timestamp,
  };
}
