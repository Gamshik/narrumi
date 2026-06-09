import type { Clock, LocalSeriesStore } from '@application/ports';

// DeleteSeriesInput identifies the local story root selected for removal.
export type DeleteSeriesInput = {
  // seriesId is the user-owned local series id to remove with its children.
  readonly seriesId: string;
};

// DeleteSeriesResult confirms the local-first removal timestamp for UI refreshes.
export type DeleteSeriesResult = {
  // deletedAt is the client time used as the durable delete operation version.
  readonly deletedAt: string;
};

// DeleteSeries removes one story root locally before any remote sync attempt.
export type DeleteSeries = {
  // execute performs a local-first deletion behind the application boundary.
  readonly execute: (input: DeleteSeriesInput) => Promise<DeleteSeriesResult>;
};

// createDeleteSeries injects storage and time boundaries for deterministic deletion.
export function createDeleteSeries(
  store: LocalSeriesStore,
  clock: Clock,
): DeleteSeries {
  return {
    execute: async ({ seriesId }) => {
      const deletedAt = clock.now().toISOString();

      await store.deleteSeries(seriesId, deletedAt);

      return { deletedAt };
    },
  };
}
