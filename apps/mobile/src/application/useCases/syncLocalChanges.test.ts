import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  LocalSeriesStore,
  RemoteSeriesStore,
  SyncOperation,
  SyncQueue,
  SyncRecord,
} from '@application/ports';
import type {
  LearningPreferences,
  Series,
  SeriesMemory,
  SyncMetadata,
} from '@domain/index';

import { createSyncLocalChanges } from './syncLocalChanges';
import { mergeSyncOperation } from '../sync';

// timestamp is the shared deterministic client version for sync tests.
const timestamp = '2026-06-06T12:00:00.000Z';
// dirtySync marks the fixture records as pending local writes.
const dirtySync: SyncMetadata = {
  isDirty: true,
  pendingOperationId: `${timestamp}:series:1:create`,
};
// characterProfiles pin dialogue labels separately from AI-facing descriptions.
const characterProfiles = [
  {
    id: 'character:mira',
    name: 'Mira',
    description: 'A curious learner reading a coded letter.',
  },
] as const;
// memory is the dependent continuity fixture used to verify replay order.
const memory: SeriesMemory = {
  id: 'series:1',
  seriesId: 'series:1',
  premise: 'A learner finds a coded letter.',
  genre: 'short-fiction',
  tone: 'Curious',
  participationMode: 'director',
  mainCharacters: ['Mira'],
  characterProfiles,
  knownFacts: [],
  openQuestions: ['Who sent the letter?'],
  importantObjectsOrLocations: [],
  recurringStoryWordIds: [],
  updatedAt: timestamp,
  sync: dirtySync,
};
// series is the parent story fixture used to verify replay order.
const series: Series = {
  id: 'series:1',
  title: 'The Letter',
  genre: 'short-fiction',
  cefrLevel: 'B1',
  tone: 'Curious',
  premise: memory.premise,
  participationMode: memory.participationMode,
  mainCharacters: memory.mainCharacters,
  characterProfiles,
  memory,
  createdAt: timestamp,
  updatedAt: timestamp,
  sync: dirtySync,
};

describe('syncLocalChanges', () => {
  it('pushes parent records before dependent memory records', async () => {
    // pushedKinds records remote call order for the foreign-key assertion.
    const pushedKinds: SyncRecord['kind'][] = [];
    const localStore = createLocalStore();
    const queue = createQueue([
      buildOperation('seriesMemory'),
      buildOperation('series'),
    ]);
    const remoteStore: RemoteSeriesStore = {
      upsert: async (_ownerId, record) => {
        pushedKinds.push(record.kind);

        return markRecordClean(record);
      },
      delete: async () => undefined,
      loadSnapshot: async () => ({
        series: [],
        seriesMemories: [],
        episodes: [],
        wordSets: [],
        learningSignals: [],
      }),
    };
    const sync = createSyncLocalChanges(
      localStore,
      remoteStore,
      queue,
      { getAuthenticatedUserId: async () => '00000000-0000-4000-8000-000000000001' },
      { getCurrentState: async () => ({ isOnline: true }) },
    );

    const result = await sync.execute();

    assert.deepEqual(pushedKinds, ['series', 'seriesMemory']);
    assert.equal(result.pushedCount, 2);
    assert.equal((await queue.list()).length, 0);
  });

  it('skips remote access while the user is unauthenticated', async () => {
    let remoteCalled = false;
    const sync = createSyncLocalChanges(
      createLocalStore(),
      {
        upsert: async () => {
          remoteCalled = true;
          throw new Error('Unexpected remote call');
        },
        delete: async () => {
          remoteCalled = true;
          throw new Error('Unexpected remote call');
        },
        loadSnapshot: async () => {
          remoteCalled = true;
          throw new Error('Unexpected remote call');
        },
      },
      createQueue([buildOperation('series')]),
      { getAuthenticatedUserId: async () => undefined },
      { getCurrentState: async () => ({ isOnline: true }) },
    );

    const result = await sync.execute();

    assert.equal(result.status, 'unauthenticated');
    assert.equal(remoteCalled, false);
  });

  it('replays durable delete operations before snapshot reconciliation', async () => {
    let deletedRecordId: string | undefined;
    let upsertCalled = false;
    const queue = createQueue([
      {
        action: 'delete',
        operationId: `series:series:1:${timestamp}:delete`,
        recordKind: 'series',
        recordId: 'series:1',
        clientUpdatedAt: timestamp,
        createdAt: timestamp,
      },
    ]);
    const remoteStore: RemoteSeriesStore = {
      upsert: async () => {
        upsertCalled = true;
        throw new Error('Unexpected upsert call');
      },
      delete: async (_ownerId, recordKind, recordId) => {
        assert.equal(recordKind, 'series');
        deletedRecordId = recordId;
      },
      loadSnapshot: async () => ({
        series: [],
        seriesMemories: [],
        episodes: [],
        wordSets: [],
        learningSignals: [],
      }),
    };
    const localStore: LocalSeriesStore = {
      ...createLocalStore(),
      listSeries: async () => [],
      getSeries: async () => undefined,
      getSeriesMemory: async () => undefined,
    };
    const sync = createSyncLocalChanges(
      localStore,
      remoteStore,
      queue,
      { getAuthenticatedUserId: async () => '00000000-0000-4000-8000-000000000001' },
      { getCurrentState: async () => ({ isOnline: true }) },
    );

    const result = await sync.execute();

    assert.equal(deletedRecordId, 'series:1');
    assert.equal(upsertCalled, false);
    assert.equal(result.pushedCount, 1);
    assert.equal((await queue.list()).length, 0);
  });
});

// buildOperation creates one pending pointer for the shared test series.
function buildOperation(
  recordKind: 'series' | 'seriesMemory',
): SyncOperation {
  return {
    action: 'upsert',
    operationId: `${recordKind}:series:1:${dirtySync.pendingOperationId}`,
    recordKind,
    recordId: 'series:1',
    clientUpdatedAt: timestamp,
    createdAt: timestamp,
  };
}

// createQueue provides an in-memory queue with the production acknowledgement contract.
function createQueue(initial: readonly SyncOperation[]): SyncQueue {
  let operations = [...initial];

  return {
    enqueue: async (operation) => {
      operations = [...mergeSyncOperation(operations, operation)];
    },
    list: async () => operations,
    remove: async (operationId) => {
      operations = operations.filter(
        (operation) => operation.operationId !== operationId,
      );
    },
    removeForRecord: async (recordKind, recordId) => {
      operations = operations.filter(
        (operation) =>
          operation.recordKind !== recordKind ||
          operation.recordId !== recordId,
      );
    },
  };
}

// createLocalStore provides the minimum mutable local persistence used by sync tests.
function createLocalStore(): LocalSeriesStore {
  let storedSeries = series;
  let storedMemory = memory;
  // preferences remains absent because this test focuses on story records.
  let preferences: LearningPreferences | undefined;

  return {
    getPreferences: async () => preferences,
    savePreferences: async (value) => {
      preferences = value;
    },
    listSeries: async () => [storedSeries],
    getSeries: async (seriesId) =>
      seriesId === storedSeries.id ? storedSeries : undefined,
    saveSeries: async (value) => {
      storedSeries = value;
    },
    deleteSeries: async () => undefined,
    listEpisodes: async () => [],
    getEpisode: async () => undefined,
    saveEpisode: async () => undefined,
    deleteEpisode: async () => undefined,
    getSeriesMemory: async (seriesId) =>
      seriesId === storedMemory.seriesId ? storedMemory : undefined,
    saveSeriesMemory: async (value) => {
      storedMemory = value;
    },
    listWordSets: async () => [],
    saveWordSet: async () => undefined,
    listLearningSignals: async () => [],
    saveLearningSignal: async () => undefined,
    getSyncMetadata: async () => undefined,
    saveSyncMetadata: async () => undefined,
  };
}

// markRecordClean simulates the canonical row returned by the database trigger.
function markRecordClean(record: SyncRecord): SyncRecord {
  const sync: SyncMetadata = {
    isDirty: false,
    pendingOperationId: record.value.sync.pendingOperationId,
    lastSyncedAt: timestamp,
  };

  switch (record.kind) {
    case 'series':
      return { kind: 'series', value: { ...record.value, sync } };
    case 'seriesMemory':
      return { kind: 'seriesMemory', value: { ...record.value, sync } };
    case 'episode':
      return { kind: 'episode', value: { ...record.value, sync } };
    case 'wordSet':
      return { kind: 'wordSet', value: { ...record.value, sync } };
    case 'learningSignal':
      return { kind: 'learningSignal', value: { ...record.value, sync } };
    case 'preferences':
      return { kind: 'preferences', value: { ...record.value, sync } };
  }
}
