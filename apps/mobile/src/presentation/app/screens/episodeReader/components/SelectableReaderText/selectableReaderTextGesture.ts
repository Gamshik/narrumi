// plainTapMaximumDurationMs separates a tap from a native long-press selection gesture.
export const plainTapMaximumDurationMs: number = 240;

// NativeSelectionRange stores the last non-empty offsets owned by one text input.
type NativeSelectionRange = {
  // end is the exclusive native selection offset.
  readonly end: number;
  // start is the inclusive native selection offset.
  readonly start: number;
};

// ShouldRestoreSelectionAfterCollapseInput distinguishes an inside tap from deselection.
type ShouldRestoreSelectionAfterCollapseInput = {
  // activeRange is the last visible non-empty range, when one exists.
  readonly activeRange: NativeSelectionRange | undefined;
  // collapsedOffset is the caret position emitted after native selection collapses.
  readonly collapsedOffset: number;
  // didMove reports whether the touch adjusted a handle instead of tapping.
  readonly didMove: boolean;
};

// ShouldReleaseResponderAfterTouchInput describes the native state at touch end.
type ShouldReleaseResponderAfterTouchInput = {
  // gestureAgeMs is the elapsed time since this finger gesture started.
  readonly gestureAgeMs: number;
  // hasNativeSelection reports whether the text input already owns a non-empty range.
  readonly hasNativeSelection: boolean;
};

// shouldReleaseResponderAfterTouch limits delayed blur to a completed plain tap.
export function shouldReleaseResponderAfterTouch({
  gestureAgeMs,
  hasNativeSelection,
}: ShouldReleaseResponderAfterTouchInput): boolean {
  return !hasNativeSelection && gestureAgeMs < plainTapMaximumDurationMs;
}

// shouldRestoreSelectionAfterCollapse preserves only stationary taps inside the active range.
export function shouldRestoreSelectionAfterCollapse({
  activeRange,
  collapsedOffset,
  didMove,
}: ShouldRestoreSelectionAfterCollapseInput): boolean {
  return Boolean(
    activeRange &&
      !didMove &&
      collapsedOffset >= activeRange.start &&
      collapsedOffset <= activeRange.end,
  );
}
