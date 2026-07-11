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
  const homeScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/HomeScreen.tsx'),
    'utf8',
  );

  assert.match(stylesSource, /seriesListGrid:\s*\{\s*gap:\s*10,/);
  assert.match(stylesSource, /seriesCard:\s*\{\s*gap:\s*8,/);
  assert.match(stylesSource, /seriesCard:\s*\{[\s\S]*?height:\s*88,/);
  assert.match(stylesSource, /seriesPremise:\s*\{[\s\S]*marginTop:\s*3,/);
  assert.match(stylesSource, /seriesCardFooter:\s*\{[\s\S]*marginTop:\s*0,/);
  assert.doesNotMatch(homeScreenSource, /isFeatured/);
  assert.doesNotMatch(stylesSource, /seriesCardFeatured/);
  assert.doesNotMatch(
    homeScreenSource,
    /minimumFontScale=\{0\.(?:76|78)\}[\s\S]{0,100}style=\{\[styles\.(?:actionTitle|secondaryText), styles\.seriesCard/,
  );
  assert.match(homeScreenSource, /style=\{\[styles\.actionTitle, styles\.seriesCardTitle\]\}/);
  assert.match(homeScreenSource, /style=\{\[styles\.secondaryText, styles\.seriesCardMeta\]\}/);
  assert.match(stylesSource, /seriesCardTitle:\s*\{\s*fontSize:\s*15,\s*lineHeight:\s*23,/);
  assert.match(stylesSource, /seriesCardMeta:\s*\{\s*fontSize:\s*13,\s*lineHeight:\s*19,/);
});

// The test keeps episode-history cards compact and prevents actions overlapping copy.
test('episode history cards reserve equal text slots without fixed card height', (): void => {
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );
  const detailsScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/SeriesDetailsScreen.tsx'),
    'utf8',
  );

  assert.match(stylesSource, /episodeCard:\s*\{\s*gap:\s*12,\s*padding:\s*16,/);
  assert.doesNotMatch(stylesSource, /episodeCard:\s*\{[\s\S]*?height:\s*232,/);
  assert.doesNotMatch(stylesSource, /episodeCardContent:\s*\{\s*flex:\s*1,/);
  assert.match(stylesSource, /episodeCardActions:\s*\{[\s\S]*?flexShrink:\s*0,/);
  assert.match(stylesSource, /episodeCardTitle:\s*\{[\s\S]*?minHeight:\s*46,/);
  assert.match(stylesSource, /episodeCardSummary:\s*\{[\s\S]*?minHeight:\s*38,/);
  assert.match(detailsScreenSource, /style=\{\[styles\.actionTitle, styles\.episodeCardTitle\]\}/);
  assert.match(detailsScreenSource, /style=\{\[styles\.secondaryText, styles\.episodeCardSummary\]\}/);
});

// The test protects Baloo titles from vertical clipping and keeps the resume action compact.
test('display titles have safe metrics and the episode action stays compact', (): void => {
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(stylesSource, /homeTitle:\s*\{[\s\S]*?lineHeight:\s*46,/);
  assert.match(stylesSource, /largeTitle:\s*\{[\s\S]*?lineHeight:\s*40,[\s\S]*?paddingVertical:\s*2,/);
  assert.match(stylesSource, /actionTitle:\s*\{[\s\S]*?lineHeight:\s*23,/);
  assert.match(stylesSource, /continueBanner:\s*\{\s*gap:\s*8,\s*padding:\s*16,/);
  assert.match(stylesSource, /bannerButton:\s*\{[\s\S]*?minHeight:\s*44,/);
});

// The test keeps the Create a Story action visually compact on populated and empty homes.
test('home creation action uses compact surface metrics', (): void => {
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(stylesSource, /heroSurfaceCompact:\s*\{\s*paddingHorizontal:\s*16,\s*paddingVertical:\s*13,/);
  assert.match(stylesSource, /heroSurfaceEmpty:\s*\{\s*minHeight:\s*168,/);
  assert.match(stylesSource, /heroContent:\s*\{\s*minHeight:\s*64,/);
  assert.match(stylesSource, /heroButtonContent:\s*\{\s*minHeight:\s*42,/);
});

// The test protects the single continuous backdrop from route-level remounts.
test('navigation renders one persistent Sorbet background', (): void => {
  const rootLayoutSource = readFileSync(
    resolve(__dirname, '../../../app/_layout.tsx'),
    'utf8',
  );
  const tabsLayoutSource = readFileSync(
    resolve(__dirname, '../../../app/(tabs)/_layout.tsx'),
    'utf8',
  );
  const routeScreenSource = readFileSync(
    resolve(__dirname, '../app/shared/RouteScreen/RouteScreen.tsx'),
    'utf8',
  );
  const bootstrapScreenSource = readFileSync(
    resolve(
      __dirname,
      '../app/bootstrap/BootstrapScreen/BootstrapScreen.tsx',
    ),
    'utf8',
  );

  assert.match(rootLayoutSource, /<SorbetBackground colors=\{colors\} \/>/);
  assert.match(
    rootLayoutSource,
    /contentStyle:\s*\{\s*backgroundColor:\s*'transparent'\s*\}/,
  );
  assert.match(
    tabsLayoutSource,
    /sceneStyle:\s*\{\s*backgroundColor:\s*'transparent'\s*\}/,
  );
  assert.doesNotMatch(routeScreenSource, /SorbetBackground/);
  assert.doesNotMatch(bootstrapScreenSource, /SorbetBackground/);
  assert.match(routeScreenSource, /style=\{styles\.routeSafeArea\}/);
});

// The test keeps ambient background depth subtle and accessibility-aware.
test('Sorbet background adds edge depth without bypassing reduced motion', (): void => {
  const backgroundSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/SorbetBackground/SorbetBackground.tsx',
    ),
    'utf8',
  );

  assert.match(backgroundSource, /styles\.ambientVeil/);
  assert.match(backgroundSource, /outputRange:\s*\[0\.12, 0\.2\]/);
  assert.match(backgroundSource, /styles\.haloRing/);
  assert.match(backgroundSource, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(backgroundSource, /if \(reduceMotion\)/);
  assert.match(backgroundSource, /pointerEvents="none"/);
});

// The test protects responsive contact, visible rebound, and reduced-motion safety.
test('Sorbet bubbles use a restrained responsive collision cycle', (): void => {
  const backgroundSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/SorbetBackground/SorbetBackground.tsx',
    ),
    'utf8',
  );

  assert.match(backgroundSource, /const collisionPoint:\s*number/);
  assert.match(backgroundSource, /const largeCollisionX:\s*number/);
  assert.match(backgroundSource, /const smallCollisionX:\s*number/);
  assert.match(backgroundSource, /inputRange:\s*\[0, 0\.86, 1\]/);
  assert.match(backgroundSource, /largeCollisionX \+ 14/);
  assert.match(backgroundSource, /smallCollisionX - 14/);
  assert.match(backgroundSource, /scaleX:\s*collisionPhase\.interpolate/);
  assert.match(backgroundSource, /scaleY:\s*collisionPhase\.interpolate/);
  assert.match(backgroundSource, /styles\.impactGlowLarge/);
  assert.match(backgroundSource, /styles\.impactGlowSmall/);
  assert.match(backgroundSource, /collisionPhase\.setValue\(0\.18\)/);
  assert.match(backgroundSource, /orbLarge:\s*\{[\s\S]*?top:\s*-62,/);
  assert.match(backgroundSource, /orbSmall:\s*\{[\s\S]*?top:\s*2,/);
});

// The test keeps three collision pairs on independent randomized scenario loops.
test('Sorbet background combines randomized collision scenarios', (): void => {
  const backgroundSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/SorbetBackground/SorbetBackground.tsx',
    ),
    'utf8',
  );
  const collisionMotionSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/SorbetBackground/collisionMotion.ts',
    ),
    'utf8',
  );

  assert.match(backgroundSource, /styles\.orbAmber/);
  assert.match(backgroundSource, /styles\.orbMint/);
  assert.match(backgroundSource, /const \[middleCollisionPhase\]/);
  assert.match(backgroundSource, /const \[bottomCollisionPhase\]/);
  assert.match(backgroundSource, /startSequentialCollisionLoop\(\{/);
  assert.match(backgroundSource, /initialDelay:\s*1200/);
  assert.match(
    backgroundSource,
    /phases:\s*\[collisionPhase, middleCollisionPhase, bottomCollisionPhase\]/,
  );
  assert.match(collisionMotionSource, /pattern:\s*'glide'/);
  assert.match(collisionMotionSource, /pattern:\s*'hesitate'/);
  assert.match(collisionMotionSource, /pattern:\s*'doubleTake'/);
  assert.match(collisionMotionSource, /Math\.random\(\)/);
  assert.match(
    collisionMotionSource,
    /while \(nextIndex === previousIndex\)/,
  );
  assert.match(collisionMotionSource, /phases\.forEach/);
  assert.match(collisionMotionSource, /previousPairIndex = pairIndex/);
  assert.equal(
    (backgroundSource.match(/outputRange:\s*\[-10, 12\]/g) ?? []).length,
    2,
  );
  assert.equal(
    (backgroundSource.match(/outputRange:\s*\[12, -10\]/g) ?? []).length,
    2,
  );
  assert.equal(
    (backgroundSource.match(/outputRange:\s*\[-9, 15\]/g) ?? []).length,
    2,
  );
});
