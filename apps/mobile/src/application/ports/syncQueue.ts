// SyncRecordKind identifies one independently reconciled local-first record type.
export type SyncRecordKind =
  | 'series'
  | 'seriesMemory'
  | 'episode'
  | 'wordSet'
  | 'learningSignal'
  | 'preferences';

// SyncOperationAction distinguishes normal record uploads from durable deletions.
export type SyncOperationAction = 'upsert' | 'delete';

// SyncOperation points to the latest local record version that must reach the cloud.
export type SyncOperation = {
  // action tells sync whether to upload a local value or delete a remote value.
  readonly action: SyncOperationAction;
  // operationId provides deterministic ordering and idempotent replay identity.
  readonly operationId: string;
  // recordKind selects the local and remote mapping used during replay.
  readonly recordKind: SyncRecordKind;
  // recordId identifies the record without storing a duplicate payload in the queue.
  readonly recordId: string;
  // clientUpdatedAt is the local record timestamp used for conflict resolution.
  readonly clientUpdatedAt: string;
  // createdAt orders independent pending operations consistently.
  readonly createdAt: string;
};

// SyncQueue persists pending local operations independently from domain records.
export type SyncQueue = {
  // enqueue replaces an older pending operation for the same record with its latest version.
  readonly enqueue: (operation: SyncOperation) => Promise<void>;
  // list returns pending operations in deterministic replay order.
  readonly list: () => Promise<readonly SyncOperation[]>;
  // remove deletes one operation only after it is applied or superseded.
  readonly remove: (operationId: string) => Promise<void>;
  // removeForRecord clears stale operations after a newer remote value wins.
  readonly removeForRecord: (
    recordKind: SyncRecordKind,
    recordId: string,
  ) => Promise<void>;
};
