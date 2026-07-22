import type { LocalSeriesStore } from '@application/ports';
import type { Episode, Series } from '@domain/index';

// LoadEpisodeReaderInput identifies one episode without exposing its storage id to routing.
export type LoadEpisodeReaderInput = {
  // seriesId scopes the local ordered episode lookup.
  readonly seriesId: string;
  // orderIndex identifies the visible episode number inside the series.
  readonly orderIndex: number;
};

// LoadEpisodeReaderResult returns the validated episode rendered by the reader.
export type LoadEpisodeReaderResult = {
  // episode is a validated locally persisted generated episode.
  readonly episode: Episode;
  // series carries the participation mode and canonical learner identity for presentation.
  readonly series: Series;
};

// LoadEpisodeReader opens one locally persisted generated episode.
export type LoadEpisodeReader = {
  // execute resolves an episode without leaking storage wiring into UI.
  readonly execute: (
    input: LoadEpisodeReaderInput,
  ) => Promise<LoadEpisodeReaderResult>;
};

// createLoadEpisodeReader injects local episode storage behind the reader contract.
export function createLoadEpisodeReader(store: LocalSeriesStore): LoadEpisodeReader {
  return {
    execute: async (input) => {
      const series = await store.getSeries(input.seriesId);

      if (!series) {
        throw new Error('Series was not found');
      }

      const episodes = await store.listEpisodes(input.seriesId);
      const episode = episodes.find(
        (candidate) => candidate.orderIndex === input.orderIndex,
      );

      if (episode) {
        return { episode, series };
      }

      throw new Error('Episode was not found');
    },
  };
}
