import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  getSliderPercentage,
  getSliderValueFromDrag,
  getSteppedSliderValue,
} from './BubbleSlider.helpers';

// The test prevents an off-center thumb press from changing the value before movement begins.
test('slider drags start from the current value and advance one step at a time', (): void => {
  assert.equal(getSliderValueFromDrag(6, 0, 120, 0, 12, 1), 6);
  assert.equal(getSliderValueFromDrag(6, -10, 120, 0, 12, 1), 5);
  assert.equal(getSliderValueFromDrag(6, 10, 120, 0, 12, 1), 7);
});

// The test callback keeps direct and accessibility adjustments inside product bounds.
test('slider candidates clamp and snap safely', (): void => {
  assert.equal(getSteppedSliderValue(-1, 0, 12, 1), 0);
  assert.equal(getSteppedSliderValue(5.6, 0, 12, 1), 6);
  assert.equal(getSteppedSliderValue(13, 0, 12, 1), 12);
  assert.equal(getSteppedSliderValue(0.74, 0, 1, 0.25), 0.75);
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
  assert.match(sliderSource, /getSliderValueFromDrag/);
  assert.match(
    sliderSource,
    /dragStartValueRef\.current = currentValueRef\.current/,
  );
  assert.doesNotMatch(sliderSource, /getSliderValueFromPosition/);
  assert.doesNotMatch(sliderSource, /pageX|locationX|moveX|measureInWindow/);
  assert.match(particleSource, /outputRange: \[0\.9, 0\.82, 0\.28, 0\]/);
  assert.doesNotMatch(sliderSource, /styles\.valueBubble/);
});
