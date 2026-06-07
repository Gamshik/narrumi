import type { SyncOperation } from '@application/ports';

// mergeSyncOperation replaces older pending work for the same logical record.
export function mergeSyncOperation(
  operations: readonly SyncOperation[],
  incoming: SyncOperation,
): readonly SyncOperation[] {
  return [
    ...operations.filter(
      (operation) =>
        operation.recordKind !== incoming.recordKind ||
        operation.recordId !== incoming.recordId,
    ),
    incoming,
  ];
}

// sortSyncOperations orders queue replay deterministically across app restarts.
export function sortSyncOperations(
  operations: readonly SyncOperation[],
): readonly SyncOperation[] {
  return [...operations].sort((left, right) => {
    const timeDifference =
      Date.parse(left.createdAt) - Date.parse(right.createdAt);

    return timeDifference || left.operationId.localeCompare(right.operationId);
  });
}
