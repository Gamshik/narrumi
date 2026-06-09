import type {
  AuthSessionProvider,
  LocalSeriesStore,
  NetworkStatus,
  RemoteSeriesSnapshot,
  RemoteSeriesStore,
  SyncOperation,
  SyncQueue,
  SyncRecord,
  SyncRecordKind,
} from '@application/ports';
import { resolveConflict } from '@application/sync';

// SyncLocalChangesResult summarizes one best-effort background reconciliation run.
export type SyncLocalChangesResult = {
  // status distinguishes completed sync from valid offline or signed-out skips.
  readonly status: 'synced' | 'offline' | 'unauthenticated' | 'failed';
  // pushedCount reports operations acknowledged by the remote store.
  readonly pushedCount: number;
  // failedCount reports operations retained for a later retry.
  readonly failedCount: number;
  // pendingCount reports queued operations observed before this sync attempt.
  readonly pendingCount: number;
  // errorMessage stores the latest safe diagnostic when sync fails.
  readonly errorMessage?: string;
};

// SyncLocalChanges replays local writes and reconciles the authenticated cloud copy.
export type SyncLocalChanges = {
  // execute preserves local data when offline, signed out, or partially failed.
  readonly execute: () => Promise<SyncLocalChangesResult>;
};

// createSyncLocalChanges composes local persistence, queue, auth, network, and cloud ports.
export function createSyncLocalChanges(
  localStore: LocalSeriesStore,
  remoteStore: RemoteSeriesStore,
  syncQueue: SyncQueue,
  authSession: AuthSessionProvider,
  networkStatus: NetworkStatus,
): SyncLocalChanges {
  return {
    execute: async () => {
      const connectivity = await networkStatus.getCurrentState();

      if (!connectivity.isOnline) {
        return {
          status: 'offline',
          pushedCount: 0,
          failedCount: 0,
          pendingCount: 0,
        };
      }

      const ownerId = await authSession.getAuthenticatedUserId();

      if (!ownerId) {
        return {
          status: 'unauthenticated',
          pushedCount: 0,
          failedCount: 0,
          pendingCount: 0,
        };
      }

      await enqueueDirtyRecords(localStore, syncQueue);
      const operations = sortByDependency(await syncQueue.list());
      let pushedCount = 0;
      let failedCount = 0;
      let latestErrorMessage: string | undefined;

      for (const operation of operations) {
        try {
          if (operation.action === 'delete') {
            await deleteRemoteRecord(remoteStore, ownerId, operation);
            await syncQueue.remove(operation.operationId);
            pushedCount += 1;
            continue;
          }

          const localRecord = await loadLocalRecord(localStore, operation);

          if (!localRecord) {
            await syncQueue.remove(operation.operationId);
            continue;
          }

          const canonicalRecord = await remoteStore.upsert(
            ownerId,
            localRecord,
          );

          await saveLocalRecord(localStore, canonicalRecord);
          await syncQueue.remove(operation.operationId);
          pushedCount += 1;
        } catch (error) {
          // A failed operation stays queued while independent records continue.
          failedCount += 1;
          latestErrorMessage = formatSyncError(operation, error);
        }
      }

      try {
        const snapshot = await remoteStore.loadSnapshot(ownerId);

        await reconcileSnapshot(localStore, syncQueue, snapshot);
      } catch (error) {
        return {
          status: 'failed',
          pushedCount,
          failedCount: failedCount + 1,
          pendingCount: operations.length,
          errorMessage: formatUnknownError(error),
        };
      }

      return {
        status: failedCount > 0 ? 'failed' : 'synced',
        pushedCount,
        failedCount,
        pendingCount: operations.length,
        ...(latestErrorMessage ? { errorMessage: latestErrorMessage } : {}),
      };
    },
  };
}

// enqueueDirtyRecords migrates pre-queue local data and repairs lost queue metadata.
async function enqueueDirtyRecords(
  store: LocalSeriesStore,
  queue: SyncQueue,
): Promise<void> {
  const seriesRecords = await store.listSeries();
  const memories = await Promise.all(
    seriesRecords.map((series) => store.getSeriesMemory(series.id)),
  );
  const episodes = (
    await Promise.all(
      seriesRecords.map((series) => store.listEpisodes(series.id)),
    )
  ).flat();
  const [wordSets, learningSignals, preferences] = await Promise.all([
    store.listWordSets(),
    store.listLearningSignals(),
    store.getPreferences(),
  ]);
  const records: readonly SyncRecord[] = [
    ...seriesRecords.map((value): SyncRecord => ({ kind: 'series', value })),
    ...memories.flatMap((value): readonly SyncRecord[] =>
      value ? [{ kind: 'seriesMemory', value }] : [],
    ),
    ...episodes.map((value): SyncRecord => ({ kind: 'episode', value })),
    ...wordSets.map((value): SyncRecord => ({ kind: 'wordSet', value })),
    ...learningSignals.map(
      (value): SyncRecord => ({ kind: 'learningSignal', value }),
    ),
    ...(preferences
      ? ([{ kind: 'preferences', value: preferences }] as const)
      : []),
  ];

  await Promise.all(
    records
      .filter((record) => record.value.sync.isDirty)
      .map((record) =>
        queue.enqueue({
          action: 'upsert',
          operationId: `${record.kind}:${getRecordId(record)}:${record.value.sync.pendingOperationId}`,
          recordKind: record.kind,
          recordId: getRecordId(record),
          clientUpdatedAt: record.value.updatedAt,
          createdAt: record.value.updatedAt,
        }),
      ),
  );
}

// deleteRemoteRecord applies durable user-requested deletions before snapshot reads.
async function deleteRemoteRecord(
  remoteStore: RemoteSeriesStore,
  ownerId: string,
  operation: SyncOperation,
): Promise<void> {
  if (operation.recordKind !== 'series' && operation.recordKind !== 'episode') {
    throw new Error(`${operation.recordKind} deletion is unsupported.`);
  }

  await remoteStore.delete(ownerId, operation.recordKind, operation.recordId);
}

// loadLocalRecord resolves a compact queue pointer to the latest local value.
async function loadLocalRecord(
  store: LocalSeriesStore,
  operation: SyncOperation,
): Promise<SyncRecord | undefined> {
  switch (operation.recordKind) {
    case 'series': {
      const value = await store.getSeries(operation.recordId);

      return value ? { kind: 'series', value } : undefined;
    }
    case 'seriesMemory': {
      const value = await store.getSeriesMemory(operation.recordId);

      return value ? { kind: 'seriesMemory', value } : undefined;
    }
    case 'episode': {
      const value = await store.getEpisode(operation.recordId);

      return value ? { kind: 'episode', value } : undefined;
    }
    case 'wordSet': {
      const value = (await store.listWordSets()).find(
        (wordSet) => wordSet.id === operation.recordId,
      );

      return value ? { kind: 'wordSet', value } : undefined;
    }
    case 'learningSignal': {
      const value = (await store.listLearningSignals()).find(
        (signal) => signal.id === operation.recordId,
      );

      return value ? { kind: 'learningSignal', value } : undefined;
    }
    case 'preferences': {
      const value = await store.getPreferences();

      return value ? { kind: 'preferences', value } : undefined;
    }
  }
}

// saveLocalRecord applies canonical remote state through the undecorated local store.
async function saveLocalRecord(
  store: LocalSeriesStore,
  record: SyncRecord,
): Promise<void> {
  switch (record.kind) {
    case 'series':
      await store.saveSeries(record.value);
      return;
    case 'seriesMemory':
      await store.saveSeriesMemory(record.value);
      return;
    case 'episode':
      await store.saveEpisode(record.value);
      return;
    case 'wordSet':
      await store.saveWordSet(record.value);
      return;
    case 'learningSignal':
      await store.saveLearningSignal(record.value);
      return;
    case 'preferences':
      await store.savePreferences(record.value);
  }
}

// reconcileSnapshot applies only remote versions that deterministically win.
async function reconcileSnapshot(
  store: LocalSeriesStore,
  queue: SyncQueue,
  snapshot: RemoteSeriesSnapshot,
): Promise<void> {
  for (const series of snapshot.series) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'series', value: series },
      await store.getSeries(series.id),
    );
  }

  for (const memory of snapshot.seriesMemories) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'seriesMemory', value: memory },
      await store.getSeriesMemory(memory.seriesId),
    );
  }

  for (const episode of snapshot.episodes) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'episode', value: episode },
      await store.getEpisode(episode.id),
    );
  }

  const localWordSets = await store.listWordSets();

  for (const wordSet of snapshot.wordSets) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'wordSet', value: wordSet },
      localWordSets.find((local) => local.id === wordSet.id),
    );
  }

  const localSignals = await store.listLearningSignals();

  for (const signal of snapshot.learningSignals) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'learningSignal', value: signal },
      localSignals.find((local) => local.id === signal.id),
    );
  }

  if (snapshot.preferences) {
    await reconcileRecord(
      store,
      queue,
      { kind: 'preferences', value: snapshot.preferences },
      await store.getPreferences(),
    );
  }
}

// reconcileRecord saves missing or newer remote state and clears superseded queue work.
async function reconcileRecord(
  store: LocalSeriesStore,
  queue: SyncQueue,
  remoteRecord: SyncRecord,
  localValue: SyncRecord['value'] | undefined,
): Promise<void> {
  if (
    localValue &&
    resolveConflict(localValue, remoteRecord.value) === 'local'
  ) {
    return;
  }

  await saveLocalRecord(store, remoteRecord);
  await queue.removeForRecord(
    remoteRecord.kind,
    getRecordId(remoteRecord),
  );
}

// getRecordId returns the stable queue identity for one discriminated record.
function getRecordId(record: SyncRecord): string {
  return record.kind === 'preferences' ? 'preferences' : record.value.id;
}

// dependencyOrder ensures parent rows exist before foreign-key dependents.
const dependencyOrder: Record<SyncRecordKind, number> = {
  series: 0,
  seriesMemory: 1,
  episode: 2,
  wordSet: 3,
  learningSignal: 4,
  preferences: 5,
};

// sortByDependency preserves foreign-key order before queue timestamp ordering.
function sortByDependency(
  operations: readonly SyncOperation[],
): readonly SyncOperation[] {
  return [...operations].sort((left, right) => {
    const actionDifference = getActionOrder(left) - getActionOrder(right);

    if (actionDifference !== 0) {
      return actionDifference;
    }

    const dependencyDifference =
      dependencyOrder[left.recordKind] - dependencyOrder[right.recordKind];

    if (dependencyDifference !== 0) {
      return dependencyDifference;
    }

    const timeDifference =
      Date.parse(left.createdAt) - Date.parse(right.createdAt);

    return timeDifference || left.operationId.localeCompare(right.operationId);
  });
}

// getActionOrder lets deletions remove stale cloud roots before child upserts replay.
function getActionOrder(operation: SyncOperation): number {
  return operation.action === 'delete' ? -1 : 0;
}

// formatSyncError attaches the failed record kind to a safe diagnostic message.
function formatSyncError(operation: SyncOperation, error: unknown): string {
  return `${operation.recordKind} ${operation.recordId}: ${formatUnknownError(error)}`;
}

// formatUnknownError keeps raw SDK objects out of the presentation layer.
function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown sync error.';
}
