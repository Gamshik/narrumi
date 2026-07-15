// HomeContentState names the mutually exclusive states of the saved-series area.
export type HomeContentState = 'loading' | 'empty' | 'ready';

// getHomeContentState prevents an unresolved series query from masquerading as an empty library.
export function getHomeContentState(
  // isLoading records whether the first local-series query is still unresolved.
  isLoading: boolean,
  // seriesCount is the number of saved series returned by the settled query.
  seriesCount: number,
): HomeContentState {
  if (isLoading) {
    return 'loading';
  }

  return seriesCount > 0 ? 'ready' : 'empty';
}
