import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  floatingTabBarMetrics,
  getFloatingTabBarContentPadding,
} from './layout';

// The test callback is synchronous because floating tab metrics are pure math.
test('floatingTabBarMetrics reserves tab clearance with no bottom inset', (): void => {
  assert.deepEqual(floatingTabBarMetrics({ bottom: 0 }), {
    bottomOffset: 18,
    tabBarHeight: 62,
    contentPaddingBottom: 104,
  });
});

// The test callback verifies large device safe areas feed both offset and padding.
test('floatingTabBarMetrics includes a large bottom safe-area inset', (): void => {
  assert.deepEqual(floatingTabBarMetrics({ bottom: 34 }), {
    bottomOffset: 40,
    tabBarHeight: 62,
    contentPaddingBottom: 126,
  });
});

// The test callback protects the number-input convenience path used by screens.
test('getFloatingTabBarContentPadding returns only the scroll padding', (): void => {
  assert.equal(getFloatingTabBarContentPadding(0), 104);
  assert.equal(getFloatingTabBarContentPadding({ bottom: 34 }), 126);
});

// The test callback keeps saved-series cards visually compact above the tab bar.
test('home saved-series mini-card spacing remains compact', (): void => {
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(stylesSource, /seriesListGrid:\s*\{\s*gap:\s*10,/);
  assert.match(stylesSource, /seriesCard:\s*\{\s*gap:\s*8,/);
  assert.match(stylesSource, /seriesPremise:\s*\{[\s\S]*marginTop:\s*3,/);
  assert.match(stylesSource, /seriesCardFooter:\s*\{[\s\S]*marginTop:\s*0,/);
});
