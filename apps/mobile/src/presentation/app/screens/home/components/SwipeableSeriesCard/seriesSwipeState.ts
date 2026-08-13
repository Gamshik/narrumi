// resolveOpenSwipeRowId protects the current row from stale close callbacks across both collections.
export function resolveOpenSwipeRowId(
  // currentRowId is the series or draft currently recorded as open by Home.
  currentRowId: string | undefined,
  // changedRowId is the series or draft reporting a native open or close transition.
  changedRowId: string,
  // shouldOpen reports the stable state requested by the changed row.
  shouldOpen: boolean,
): string | undefined {
  if (shouldOpen) {
    return changedRowId;
  }

  return currentRowId === changedRowId ? undefined : currentRowId;
}
