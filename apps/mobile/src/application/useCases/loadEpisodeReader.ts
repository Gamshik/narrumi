import type { LocalSeriesStore } from '@application/ports';
import type { Episode } from '@domain/index';

// LoadEpisodeReaderInput identifies the optional locally stored episode to open.
export type LoadEpisodeReaderInput = {
  // episodeId reads a persisted local episode.
  readonly episodeId?: string;
};

// LoadEpisodeReaderResult returns the validated episode rendered by the reader.
export type LoadEpisodeReaderResult = {
  // episode is a validated locally persisted generated episode.
  readonly episode: Episode;
};

// LoadEpisodeReader opens one locally persisted generated episode.
export type LoadEpisodeReader = {
  // execute resolves an episode without leaking storage wiring into UI.
  readonly execute: (
    input?: LoadEpisodeReaderInput,
  ) => Promise<LoadEpisodeReaderResult>;
};

// createLoadEpisodeReader injects local episode storage behind the reader contract.
export function createLoadEpisodeReader(store: LocalSeriesStore): LoadEpisodeReader {
  return {
    execute: async (input = {}) => {
      if (input.episodeId) {
        const episode = await store.getEpisode(input.episodeId);

        if (episode) {
          return { episode };
        }
      }

      throw new Error('Episode was not found');
    },
  };
}
