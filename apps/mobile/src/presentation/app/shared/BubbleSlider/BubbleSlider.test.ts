import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  getSliderPercentage,
  getSliderTouchPosition,
  getSliderValueFromPosition,
  getSteppedSliderValue,
} from './BubbleSlider.helpers';

// The test callback protects bounded integer Story Word values during drag gestures.
test('slider positions snap to valid Story Word steps', (): void => {
  assert.equal(getSliderValueFromPosition(-20, 120, 0, 12, 1), 0);
  assert.equal(getSliderValueFromPosition(54, 120, 0, 12, 1), 5);
  assert.equal(getSliderValueFromPosition(200, 120, 0, 12, 1), 12);
});

// The test callback keeps direct and accessibility adjustments inside product bounds.
test('slider candidates clamp and snap safely', (): void => {
  assert.equal(getSteppedSliderValue(-1, 0, 12, 1), 0);
  assert.equal(getSteppedSliderValue(5.6, 0, 12, 1), 6);
  assert.equal(getSteppedSliderValue(13, 0, 12, 1), 12);
  assert.equal(getSteppedSliderValue(0.74, 0, 1, 0.25), 0.75);
});

// The test protects Android drag mapping from child-relative locationX changes during one gesture.
test('slider touch position prefers measured window coordinates', (): void => {
  assert.equal(getSliderTouchPosition(184, 64, 9, 12), 120);
  assert.equal(getSliderTouchPosition(184, undefined, 49, 12), 37);
});

// The test callback keeps visual progress bounded for stale persisted values.
test('slider progress remains between zero and one', (): void => {
  assert.equal(getSliderPercentage(-2, 0, 12), 0);
  assert.equal(getSliderPercentage(6, 0, 12), 0.5);
  assert.equal(getSliderPercentage(14, 0, 12), 1);
  assert.equal(getSliderPercentage(5, 5, 5), 0);
});

// The test callback prevents React Native from attaching slider motion to mixed animation drivers.
test('slider keeps position and micro-bubble motion on the JS driver', (): void => {
  const sliderSource: string = readFileSync(
    resolve(__dirname, 'BubbleSlider.tsx'),
    'utf8',
  );
  // particleSource keeps decorative iOS motion separate from Android drag rendering.
  const particleSource: string = readFileSync(
    resolve(__dirname, 'BubbleSliderParticles.tsx'),
    'utf8',
  );

  assert.doesNotMatch(sliderSource, /useNativeDriver:\s*true/);
  assert.match(sliderSource, /useNativeDriver:\s*false/);
  assert.match(sliderSource, /<BubbleSliderParticles/);
  assert.match(particleSource, /styles\.particleLarge/);
  assert.match(sliderSource, /supportsSliderParticles:\s*boolean = Platform\.OS !== 'android'/);
  assert.match(sliderSource, /emitMicroBubbles\(movementDirection\)/);
  assert.match(sliderSource, /event\.nativeEvent\.pageX/);
  assert.match(sliderSource, /gestureState\.moveX - trackPageXRef\.current/);
  assert.match(sliderSource, /measureInWindow/);
  assert.match(particleSource, /outputRange: \[0\.9, 0\.82, 0\.28, 0\]/);
  assert.doesNotMatch(sliderSource, /styles\.valueBubble/);
});
