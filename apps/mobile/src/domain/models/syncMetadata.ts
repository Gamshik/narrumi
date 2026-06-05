// SyncMetadata marks local-first records that must later reconcile with Supabase.
export type SyncMetadata = {
  // isDirty tells sync code that this record has unapplied local changes.
  readonly isDirty: boolean;
  // pendingOperationId gives sync code a stable local operation identity.
  readonly pendingOperationId: string;
  // lastSyncedAt stores the last successful remote sync timestamp when one exists.
  readonly lastSyncedAt?: string;
};
