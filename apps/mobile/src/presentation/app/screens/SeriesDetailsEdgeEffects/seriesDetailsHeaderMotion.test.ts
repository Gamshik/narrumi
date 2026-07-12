import assert from 'node:assert/strict';
import test from 'node:test';

import { getSeriesTitleScrollThresholds } from './seriesDetailsHeaderMotion';

// The test keeps compact-title timing attached to the measured top and bottom edges of a one-line title.
test('series title thresholds align each text edge with the blur boundary', (): void => {
  assert.deepEqual(
    getSeriesTitleScrollThresholds({
      blurBottom: 168,
      headerTop: 180,
      titleTop: 32,
      titleHeight: 40,
    }),
    {
      appearanceOffset: 84,
      disappearanceOffset: 44,
    },
  );
});

// The test verifies a wrapped title stays hidden until its taller bottom edge enters the blur.
test('series title appearance accounts for a wrapped title height', (): void => {
  assert.deepEqual(
    getSeriesTitleScrollThresholds({
      blurBottom: 168,
      headerTop: 180,
      titleTop: 32,
      titleHeight: 80,
    }),
    {
      appearanceOffset: 124,
      disappearanceOffset: 44,
    },
  );
});
