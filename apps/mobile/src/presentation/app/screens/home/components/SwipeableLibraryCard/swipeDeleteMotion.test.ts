import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  getSwipeDeleteActionPresentation,
  swipeDeleteActionWidth,
  swipeDeleteActivationDistance,
  swipeDeleteOpenThreshold,
} from './swipeDeleteMotion';

// The suite protects shared series-and-draft geometry and sequential Sorbet reveal.
describe('swipeDeleteMotion', (): void => {
  // One shared width preserves a comfortable target without making either row feel heavy.
  test('keeps the destructive lane intentional and easy to reveal', (): void => {
    assert.equal(swipeDeleteActionWidth, 104);
    assert.ok(swipeDeleteOpenThreshold < swipeDeleteActionWidth / 2);
    assert.ok(swipeDeleteActivationDistance >= 10);
  });

  // Hidden and overshooting values must resolve to deterministic visual endpoints.
  test('clamps every action layer outside native progress bounds', (): void => {
    assert.deepEqual(getSwipeDeleteActionPresentation(-0.5), {
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
    assert.deepEqual(getSwipeDeleteActionPresentation(1.5), {
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
    const earlyPresentation = getSwipeDeleteActionPresentation(0.12);
    const middlePresentation = getSwipeDeleteActionPresentation(0.48);
    const openPresentation = getSwipeDeleteActionPresentation(1);

    assert.ok(earlyPresentation.haloOpacity > 0);
    assert.equal(earlyPresentation.orbOpacity, 0);
    assert.ok(middlePresentation.orbOpacity > 0);
    assert.equal(middlePresentation.labelOpacity, 0);
    assert.equal(openPresentation.labelOpacity, 1);
  });
});
