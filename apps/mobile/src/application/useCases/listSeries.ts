import type { LocalSeriesStore } from '@application/ports';
import type { Series } from '@domain/index';

// ListSeriesResult returns locally persisted personal series in display order.
export type ListSeriesResult = {
  // series are validated records loaded from the local store.
  readonly series: readonly Series[];
};

// ListSeries reads local personal series without exposing storage details.
export type ListSeries = {
  // execute returns all local series, sorted by the adapter contract.
  readonly execute: () => Promise<ListSeriesResult>;
};

// createListSeries injects the local store behind the application contract.
export function createListSeries(store: LocalSeriesStore): ListSeries {
  return {
    execute: async () => ({ series: await store.listSeries() }),
  };
}
