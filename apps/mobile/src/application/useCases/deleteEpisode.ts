import type { Clock, LocalSeriesStore } from '@application/ports';

// DeleteEpisodeInput identifies one generated learning unit for removal.
export type DeleteEpisodeInput = {
  // episodeId is the local episode id selected by the user.
  readonly episodeId: string;
};

// DeleteEpisodeResult confirms the local-first removal timestamp for UI refreshes.
export type DeleteEpisodeResult = {
  // deletedAt is the client time used as the durable delete operation version.
  readonly deletedAt: string;
};

// DeleteEpisode removes a generated episode without deleting the parent series.
export type DeleteEpisode = {
  // execute performs the local deletion behind the application boundary.
  readonly execute: (input: DeleteEpisodeInput) => Promise<DeleteEpisodeResult>;
};

// createDeleteEpisode injects storage and time boundaries for deterministic deletion.
export function createDeleteEpisode(
  store: LocalSeriesStore,
  clock: Clock,
): DeleteEpisode {
  return {
    execute: async ({ episodeId }) => {
      const deletedAt = clock.now().toISOString();

      await store.deleteEpisode(episodeId, deletedAt);

      return { deletedAt };
    },
  };
}
