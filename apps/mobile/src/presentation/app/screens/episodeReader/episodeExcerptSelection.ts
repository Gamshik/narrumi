// EpisodeExcerptSelection identifies exact selected Reader copy.
export type EpisodeExcerptSelection = {
  // ownerKey identifies the one text surface that currently owns native handles.
  readonly ownerKey: string;
  // selectedText is the exact trimmed source fragment shown to the translation action.
  readonly selectedText: string;
};

// EpisodeSelectionRange is the native UTF-16 range reported by React Native.
export type EpisodeSelectionRange = {
  // start is the inclusive source-text offset.
  readonly start: number;
  // end is the exclusive source-text offset.
  readonly end: number;
};

// ClearEpisodeExcerptSelectionInput scopes deselection to the native surface that emitted it.
type ClearEpisodeExcerptSelectionInput = {
  // currentSelection is the range currently visible to the reader action UI.
  readonly currentSelection: EpisodeExcerptSelection | undefined;
  // ownerKey identifies the surface whose native selection just collapsed.
  readonly ownerKey: string;
};

// readerSelectionScrollThresholdPx ignores UIKit micro-movement during selection.
const readerSelectionScrollThresholdPx: number = 4;

// CreateEpisodeExcerptSelectionInput combines one native range with its exact Reader copy.
type CreateEpisodeExcerptSelectionInput = EpisodeSelectionRange & {
  // ownerKey uniquely identifies the selectable Reader surface.
  readonly ownerKey: string;
  // text is the complete copy rendered by that surface.
  readonly text: string;
};

// createEpisodeExcerptSelection trims selection edges without adding surrounding text.
export function createEpisodeExcerptSelection({
  end,
  ownerKey,
  start,
  text,
}: CreateEpisodeExcerptSelectionInput): EpisodeExcerptSelection | undefined {
  if (!text) {
    return undefined;
  }

  const safeStart: number = clamp(Math.min(start, end), 0, text.length);
  const safeEnd: number = clamp(Math.max(start, end), safeStart, text.length);
  const rawSelection: string = text.slice(safeStart, safeEnd);
  const selectedText: string = rawSelection.trim();

  if (!selectedText) {
    return undefined;
  }

  return {
    ownerKey,
    selectedText,
  };
}

// clearEpisodeExcerptSelectionForOwner prevents a stale blur from clearing a newer surface.
export function clearEpisodeExcerptSelectionForOwner({
  currentSelection,
  ownerKey,
}: ClearEpisodeExcerptSelectionInput): EpisodeExcerptSelection | undefined {
  return currentSelection?.ownerKey === ownerKey
    ? undefined
    : currentSelection;
}

// createSelectionOwnerKey produces a stable owner for prose and interaction copy.
export function createSelectionOwnerKey(
  scopeId: string,
  contentKey: string | number,
): string {
  return `${scopeId}:${contentKey}`;
}

// shouldDismissReaderSelectionForScroll requires actual episode displacement.
export function shouldDismissReaderSelectionForScroll(
  startOffset: number,
  currentOffset: number,
): boolean {
  return (
    Math.abs(currentOffset - startOffset) >= readerSelectionScrollThresholdPx
  );
}

// clamp keeps untrusted native offsets inside the selected sentence.
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
