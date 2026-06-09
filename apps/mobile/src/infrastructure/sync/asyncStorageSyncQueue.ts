import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  syncRecordKinds,
  type SyncOperation,
  type SyncQueue,
} from '@application/ports';
import {
  mergeSyncOperation,
  sortSyncOperations,
} from '@application/sync';

// SYNC_QUEUE_KEY owns the durable pending-operation list in AsyncStorage.
const SYNC_QUEUE_KEY = '@context-english/sync-queue';

// AsyncStorageSyncQueue persists compact replay pointers across app restarts.
export class AsyncStorageSyncQueue implements SyncQueue {
  // pendingMutation serializes read-modify-write cycles inside one app process.
  private pendingMutation: Promise<void> = Promise.resolve();

  // enqueue keeps only the latest pending operation for one record.
  async enqueue(operation: SyncOperation): Promise<void> {
    await this.mutate((operations) =>
      mergeSyncOperation(operations, operation),
    );
  }

  // list returns operations in stable timestamp and id order.
  async list(): Promise<readonly SyncOperation[]> {
    await this.pendingMutation;
    const operations = await this.read();

    return sortSyncOperations(operations);
  }

  // remove deletes the exact replay operation after successful remote application.
  async remove(operationId: string): Promise<void> {
    await this.mutate((operations) =>
      operations.filter((operation) => operation.operationId !== operationId),
    );
  }

  // removeForRecord clears an operation superseded by a newer remote record.
  async removeForRecord(
    recordKind: SyncOperation['recordKind'],
    recordId: string,
  ): Promise<void> {
    await this.mutate((operations) =>
      operations.filter(
        (operation) =>
          operation.recordKind !== recordKind ||
          operation.recordId !== recordId,
      ),
    );
  }

  // mutate serializes one durable queue transformation and preserves later work after errors.
  private async mutate(
    transform: (
      operations: readonly SyncOperation[],
    ) => readonly SyncOperation[],
  ): Promise<void> {
    const mutation = this.pendingMutation.then(async () => {
      const operations = await this.read();

      await this.write(transform(operations));
    });

    this.pendingMutation = mutation.catch(() => undefined);
    await mutation;
  }

  // read validates mutable queue JSON and drops malformed operations.
  private async read(): Promise<readonly SyncOperation[]> {
    const rawValue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);

    if (!rawValue) {
      return [];
    }

    try {
      const value: unknown = JSON.parse(rawValue);

      return Array.isArray(value) ? value.flatMap(parseOperation) : [];
    } catch {
      return [];
    }
  }

  // write replaces the compact queue after enqueue or acknowledgement.
  private async write(operations: readonly SyncOperation[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(operations));
  }
}

// parseOperation validates one untrusted AsyncStorage queue entry.
function parseOperation(value: unknown): readonly SyncOperation[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const operationId = record.operationId;
  const recordKind = record.recordKind;
  const recordId = record.recordId;
  const clientUpdatedAt = record.clientUpdatedAt;
  const createdAt = record.createdAt;
  const action = record.action;

  if (
    typeof operationId !== 'string' ||
    typeof recordKind !== 'string' ||
    !syncRecordKinds.includes(recordKind as SyncOperation['recordKind']) ||
    typeof recordId !== 'string' ||
    typeof clientUpdatedAt !== 'string' ||
    !Number.isFinite(Date.parse(clientUpdatedAt)) ||
    typeof createdAt !== 'string' ||
    !Number.isFinite(Date.parse(createdAt)) ||
    (action !== undefined && action !== 'upsert' && action !== 'delete')
  ) {
    return [];
  }

  return [
    {
      action: action === 'delete' ? 'delete' : 'upsert',
      operationId,
      recordKind: recordKind as SyncOperation['recordKind'],
      recordId,
      clientUpdatedAt,
      createdAt,
    },
  ];
}
