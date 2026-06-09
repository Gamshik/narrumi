import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SyncOperation } from '@application/ports';

import { mergeSyncOperation, sortSyncOperations } from './syncQueuePolicy';

// buildOperation creates one deterministic queue-policy test value.
function buildOperation(
  operationId: string,
  recordId: string,
  createdAt: string,
): SyncOperation {
  return {
    action: 'upsert',
    operationId,
    recordKind: 'series',
    recordId,
    clientUpdatedAt: createdAt,
    createdAt,
  };
}

describe('syncQueuePolicy', () => {
  it('keeps only the newest pending operation for the same record', () => {
    const original = buildOperation(
      'series:1:first',
      'series:1',
      '2026-06-06T10:00:00.000Z',
    );
    const latest = buildOperation(
      'series:1:latest',
      'series:1',
      '2026-06-06T11:00:00.000Z',
    );

    assert.deepEqual(mergeSyncOperation([original], latest), [latest]);
  });

  it('does not replace a durable delete with a repaired dirty upsert', () => {
    const deleted = {
      ...buildOperation(
        'series:1:delete',
        'series:1',
        '2026-06-06T11:00:00.000Z',
      ),
      action: 'delete' as const,
    };
    const repairedUpsert = buildOperation(
      'series:1:repaired',
      'series:1',
      '2026-06-06T12:00:00.000Z',
    );

    assert.deepEqual(mergeSyncOperation([deleted], repairedUpsert), [deleted]);
  });

  it('orders equal timestamps by stable operation id', () => {
    const timestamp = '2026-06-06T10:00:00.000Z';
    const laterId = buildOperation('series:b', 'series:2', timestamp);
    const earlierId = buildOperation('series:a', 'series:1', timestamp);

    assert.deepEqual(sortSyncOperations([laterId, earlierId]), [
      earlierId,
      laterId,
    ]);
  });
});
