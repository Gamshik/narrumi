import type { LocalSeriesStore } from '@application/ports';
import type { Episode, Series, SeriesMemory } from '@domain/index';

// LoadSeriesDetailsInput identifies the local story to inspect.
export type LoadSeriesDetailsInput = {
  // seriesId is the selected local series id.
  readonly seriesId: string;
};

// LoadSeriesDetailsResult returns the local series aggregate for presentation.
export type LoadSeriesDetailsResult = {
  // series is the selected local story container.
  readonly series: Series;
  // episodes are locally saved generated units in reading order.
  readonly episodes: readonly Episode[];
  // memory is the compact continuity state for future generation.
  readonly memory?: SeriesMemory;
};

// LoadSeriesDetails reads one local story with its episodes and memory.
export type LoadSeriesDetails = {
  // execute returns the local aggregate without exposing storage details.
  readonly execute: (
    input: LoadSeriesDetailsInput,
  ) => Promise<LoadSeriesDetailsResult>;
};

// createLoadSeriesDetails injects the local store behind the screen contract.
export function createLoadSeriesDetails(store: LocalSeriesStore): LoadSeriesDetails {
  return {
    execute: async ({ seriesId }) => {
      const series = await store.getSeries(seriesId);

      if (!series) {
        throw new Error('Series was not found');
      }

      const episodes = await store.listEpisodes(seriesId);
      const memory = await store.getSeriesMemory(seriesId);

      return {
        series,
        episodes,
        ...(memory ? { memory } : {}),
      };
    },
  };
}
