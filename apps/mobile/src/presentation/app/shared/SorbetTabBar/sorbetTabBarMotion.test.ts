import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { darkColors, lightColors } from '@presentation/theme/tokens';

import { getActiveIndicatorOffset } from './sorbetTabBarMotion';

// The test callback protects responsive equal-width centering for every navigation destination.
test('active tab bubble stays centered across the floating dock', (): void => {
  assert.equal(getActiveIndicatorOffset(300, 3, 0), 30);
  assert.equal(getActiveIndicatorOffset(300, 3, 1), 130);
  assert.equal(getActiveIndicatorOffset(300, 3, 2), 230);
});

// The test callback keeps stale route state from moving the bubble outside the toy shell.
test('active tab bubble clamps invalid navigation state', (): void => {
  assert.equal(getActiveIndicatorOffset(300, 3, -1), 30);
  assert.equal(getActiveIndicatorOffset(300, 3, 7), 230);
  assert.equal(getActiveIndicatorOffset(0, 3, 1), 0);
  assert.equal(getActiveIndicatorOffset(300, 0, 1), 0);
});

// The test callback protects the toy-gel capsule and candy bubble in both appearances.
test('tab bar uses the shared Sorbet toy material', (): void => {
  assert.equal(lightColors.tabBarToyGradient.length, 3);
  assert.equal(darkColors.tabBarToyGradient.length, 3);
  assert.match(lightColors.tabBarToyHighlight, /rgba/);
  assert.match(darkColors.tabBarToyShade, /rgba/);
  assert.equal(lightColors.tabBarActiveGradient.length, 3);
  assert.equal(darkColors.tabBarActiveGradient.length, 3);
  assert.match(lightColors.tabBarToyBubbleHighlight, /rgba/);
  assert.match(darkColors.tabBarToyBubbleShade, /rgba/);
  assert.match(lightColors.tabBarRippleFront, /rgba/);
  assert.match(darkColors.tabBarRippleFront, /rgba/);
});

// The test callback protects vector icons, toy-gel travel, and reduced-motion scene behavior.
test('tab navigation uses toy-gel motion without platform emoji', (): void => {
  const tabBarSource = readFileSync(
    resolve(__dirname, 'SorbetTabBar.tsx'),
    'utf8',
  );
  const iconSource = readFileSync(
    resolve(__dirname, 'SorbetTabIcon/SorbetTabIcon.tsx'),
    'utf8',
  );
  const bubbleSource = readFileSync(
    resolve(__dirname, 'SorbetTabBubble/SorbetTabBubble.tsx'),
    'utf8',
  );
  const preferenceSource = readFileSync(
    resolve(__dirname, 'useReducedMotionPreference.ts'),
    'utf8',
  );
  const lensMotionSource = readFileSync(
    resolve(__dirname, 'useActiveTabLensMotion.ts'),
    'utf8',
  );
  const tabsLayoutSource = readFileSync(
    resolve(__dirname, '../../../../../app/(tabs)/_layout.tsx'),
    'utf8',
  );

  assert.doesNotMatch(tabBarSource, /<BlurView/);
  assert.match(tabBarSource, /tabBarToyGradient/);
  assert.match(tabBarSource, /styles\.shellHighlight/);
  assert.match(tabBarSource, /<SorbetTabBubble/);
  assert.match(bubbleSource, /<Circle/);
  assert.match(bubbleSource, /clipPath="url\(#sorbet-tab-bubble-clip\)"/);
  assert.match(lensMotionSource, /Animated\.parallel/);
  assert.match(lensMotionSource, /indicatorScale/);
  assert.match(lensMotionSource, /outputRange:\s*\[1, 1\.04\]/);
  assert.doesNotMatch(lensMotionSource, /scaleX|scaleY/);
  assert.doesNotMatch(tabBarSource, /scaleX|scaleY/);
  assert.match(lensMotionSource, /trailOpacity/);
  assert.match(lensMotionSource, /triggerPressRipple/);
  assert.match(lensMotionSource, /rippleFrontOpacity/);
  assert.match(tabBarSource, /pressRippleEcho/);
  assert.doesNotMatch(tabBarSource, /🏠|📖|⚙️/);
  assert.match(iconSource, /react-native-svg/);
  assert.match(preferenceSource, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(
    tabsLayoutSource,
    /animation:\s*reduceMotion \? 'none' : 'shift'/,
  );
});
