import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { VersionedSyncRecord } from './conflictResolver';
import { resolveConflict } from './conflictResolver';

// buildRecord creates the minimum versioned record used by conflict tests.
function buildRecord(
  updatedAt: string,
  operationId: string,
  isDirty = true,
): VersionedSyncRecord {
  return {
    updatedAt,
    sync: {
      isDirty,
      pendingOperationId: operationId,
    },
  };
}

describe('resolveConflict', () => {
  it('keeps a newer dirty local record over stale remote data', () => {
    const localRecord = buildRecord('2026-06-06T12:00:00.000Z', 'local:2');
    const remoteRecord = buildRecord(
      '2026-06-06T11:00:00.000Z',
      'remote:4',
      false,
    );

    assert.equal(resolveConflict(localRecord, remoteRecord), 'local');
  });

  it('applies a newer remote record to an older local copy', () => {
    const localRecord = buildRecord('2026-06-06T11:00:00.000Z', 'local:2');
    const remoteRecord = buildRecord(
      '2026-06-06T12:00:00.000Z',
      'remote:4',
      false,
    );

    assert.equal(resolveConflict(localRecord, remoteRecord), 'remote');
  });

  it('uses the operation id as a stable timestamp tie-breaker', () => {
    const timestamp = '2026-06-06T12:00:00.000Z';
    const localRecord = buildRecord(timestamp, 'device-a:4');
    const remoteRecord = buildRecord(timestamp, 'device-b:1', false);

    assert.equal(resolveConflict(localRecord, remoteRecord), 'remote');
  });
});
