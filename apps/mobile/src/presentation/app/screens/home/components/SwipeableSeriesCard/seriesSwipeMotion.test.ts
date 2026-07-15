import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getSeriesDeleteActionPresentation,
  seriesSwipeActionWidth,
  seriesSwipeActivationDistance,
  seriesSwipeOpenThreshold,
} from './seriesSwipeMotion';

// The suite protects the geometry and sequential Sorbet reveal delegated to native motion.
describe('seriesSwipeMotion', (): void => {
  // One shared width must preserve a comfortable target without making the swipe feel heavy.
  test('keeps the destructive lane intentional and easy to reveal', (): void => {
    assert.equal(seriesSwipeActionWidth, 104);
    assert.ok(seriesSwipeOpenThreshold < seriesSwipeActionWidth / 2);
    assert.ok(seriesSwipeActivationDistance >= 10);
  });

  // Hidden and overshooting values must resolve to deterministic visual endpoints.
  test('clamps every action layer outside native progress bounds', (): void => {
    assert.deepEqual(getSeriesDeleteActionPresentation(-0.5), {
      haloOpacity: 0,
      haloScale: 0.58,
      haloTranslateX: 22,
      labelOpacity: 0,
      labelTranslateY: 7,
      orbOpacity: 0,
      orbRotation: 8,
      orbScale: 0.68,
      orbTranslateX: 18,
      sheenOpacity: 0,
      sheenTranslateX: 44,
    });
    assert.deepEqual(getSeriesDeleteActionPresentation(1.5), {
      haloOpacity: 0.42,
      haloScale: 1.16,
      haloTranslateX: -6,
      labelOpacity: 1,
      labelTranslateY: 0,
      orbOpacity: 1,
      orbRotation: 0,
      orbScale: 1,
      orbTranslateX: 0,
      sheenOpacity: 0.54,
      sheenTranslateX: -14,
    });
  });

  // Background, icon, and label should arrive in order rather than appearing as one flat block.
  test('sequences material light, icon bubble, and label', (): void => {
    const earlyPresentation = getSeriesDeleteActionPresentation(0.12);
    const middlePresentation = getSeriesDeleteActionPresentation(0.48);
    const openPresentation = getSeriesDeleteActionPresentation(1);

    assert.ok(earlyPresentation.haloOpacity > 0);
    assert.equal(earlyPresentation.orbOpacity, 0);
    assert.ok(middlePresentation.orbOpacity > 0);
    assert.equal(middlePresentation.labelOpacity, 0);
    assert.equal(openPresentation.labelOpacity, 1);
  });
});
