import type { SyncMetadata } from '@domain/index';

// VersionedSyncRecord is the minimum contract needed for deterministic reconciliation.
export type VersionedSyncRecord = {
  // updatedAt is the client-authored record timestamp.
  readonly updatedAt: string;
  // sync carries the operation id used as the timestamp tie-breaker.
  readonly sync: SyncMetadata;
};

// ConflictWinner identifies which copy must remain after deterministic comparison.
export type ConflictWinner = 'local' | 'remote';

// resolveConflict compares timestamps first and stable operation ids second.
export function resolveConflict(
  localRecord: VersionedSyncRecord,
  remoteRecord: VersionedSyncRecord,
): ConflictWinner {
  const localTime = Date.parse(localRecord.updatedAt);
  const remoteTime = Date.parse(remoteRecord.updatedAt);

  if (remoteTime > localTime) {
    return 'remote';
  }

  if (localTime > remoteTime) {
    return 'local';
  }

  return remoteRecord.sync.pendingOperationId >
    localRecord.sync.pendingOperationId
    ? 'remote'
    : 'local';
}
