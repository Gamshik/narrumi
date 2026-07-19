import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// componentSource captures the implementation contract without requiring a native renderer.
const componentSource: string = readFileSync(
  resolve(__dirname, 'HomeSeriesSkeleton.tsx'),
  'utf8',
);

// The test protects the Home loading state from regressing to static, inaccessible motion.
test('Home skeleton pulses with native animation and respects Reduce Motion', (): void => {
  assert.match(componentSource, /Animated\.loop/);
  assert.match(componentSource, /useNativeDriver:\s*true/);
  assert.match(componentSource, /useReducedMotionPreference/);
  assert.match(componentSource, /if \(reduceMotion\)/);
  assert.match(componentSource, /pulseAnimation\.stop\(\)/);
  assert.match(componentSource, /trailingOpacity/);
  assert.match(componentSource, /translateX:\s*leadingDrift/);
  assert.match(componentSource, /scale:\s*actionScale/);
});
