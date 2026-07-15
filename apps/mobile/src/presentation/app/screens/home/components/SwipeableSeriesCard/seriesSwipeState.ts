// resolveOpenSwipeSeriesId protects the current row from stale close callbacks emitted by another row.
export function resolveOpenSwipeSeriesId(
  // currentSeriesId is the row currently recorded as open by Home.
  currentSeriesId: string | undefined,
  // changedSeriesId is the row reporting a native open or close transition.
  changedSeriesId: string,
  // shouldOpen reports the stable state requested by the changed row.
  shouldOpen: boolean,
): string | undefined {
  if (shouldOpen) {
    return changedSeriesId;
  }

  return currentSeriesId === changedSeriesId ? undefined : currentSeriesId;
}
