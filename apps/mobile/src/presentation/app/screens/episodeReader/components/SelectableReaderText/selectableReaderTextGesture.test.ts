import assert from 'node:assert/strict';
import test from 'node:test';

import {
  shouldReleaseResponderAfterTouch,
  shouldRestoreSelectionAfterCollapse,
} from './selectableReaderTextGesture';

// This regression keeps one harmless tap from consuming the next scroll gesture.
test('a plain tap releases the text responder before the next reader scroll', (): void => {
  assert.equal(
    shouldReleaseResponderAfterTouch({
      gestureAgeMs: 90,
      hasNativeSelection: false,
    }),
    true,
  );
});

// This regression protects native selection from the plain-tap cleanup timer.
test('long press and selected ranges keep the native responder for selection', (): void => {
  assert.equal(
    shouldReleaseResponderAfterTouch({
      gestureAgeMs: 420,
      hasNativeSelection: false,
    }),
    false,
  );
  assert.equal(
    shouldReleaseResponderAfterTouch({
      gestureAgeMs: 90,
      hasNativeSelection: true,
    }),
    false,
  );
});

// This regression keeps repeated taps from visually separating selection and controls.
test('a stationary tap inside the selected range restores native selection', (): void => {
  assert.equal(
    shouldRestoreSelectionAfterCollapse({
      activeRange: { end: 12, start: 5 },
      collapsedOffset: 8,
      didMove: false,
    }),
    true,
  );
});

// This regression removes controls when native selection genuinely disappears.
test('a caret outside the range or a collapsed handle clears selection', (): void => {
  assert.equal(
    shouldRestoreSelectionAfterCollapse({
      activeRange: { end: 12, start: 5 },
      collapsedOffset: 16,
      didMove: false,
    }),
    false,
  );
  assert.equal(
    shouldRestoreSelectionAfterCollapse({
      activeRange: { end: 12, start: 5 },
      collapsedOffset: 8,
      didMove: true,
    }),
    false,
  );
});
