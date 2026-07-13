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

// The test protects a full-width Setup hero behind fixed icon navigation and shared edge material.
test('episode setup uses fixed icon navigation over shared screen edges', (): void => {
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );
  const dailySessionRouteSource = readFileSync(
    resolve(__dirname, '../../../app/daily-session.tsx'),
    'utf8',
  );
  const dailySessionSource = readFileSync(
    resolve(__dirname, '../app/screens/DailySessionScreen.tsx'),
    'utf8',
  );
  const dailySessionEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/DailySessionEdgeEffects/DailySessionEdgeEffects.tsx',
    ),
    'utf8',
  );
  const sharedEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/ScreenEdgeEffects/ScreenEdgeEffects.tsx',
    ),
    'utf8',
  );
  const backIconButtonSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/BackIconButton/BackIconButton.tsx',
    ),
    'utf8',
  );
  const backIconButtonStylesSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/BackIconButton/BackIconButton.styles.ts',
    ),
    'utf8',
  );

  assert.match(
    dailySessionRouteSource,
    /<RouteScreen isDark=\{isDark\} isEdgeToEdge/,
  );
  assert.match(dailySessionSource, /<BlurTargetView ref=\{blurTargetRef\}/);
  assert.match(dailySessionSource, /<Animated\.ScrollView/);
  assert.match(dailySessionSource, /onScroll=\{handleSetupScroll\}/);
  assert.match(dailySessionSource, /setupHeaderCollapseOffset:\s*number = 38/);
  assert.match(dailySessionSource, /setupHeaderExpandOffset:\s*number = 12/);
  assert.match(
    dailySessionSource,
    /paddingTop:\s*insets\.top \+ screenEdgeDepths\.compactTop \+ 2/,
  );
  assert.match(dailySessionSource, /duration:\s*setupTitleTransitionDuration/);
  assert.match(dailySessionSource, /duration:\s*setupMaterialTransitionDuration/);
  assert.match(dailySessionSource, /styles\.dailySessionTitleBlock/);
  assert.match(dailySessionSource, /screenEdgeDepths\.modalBottom/);
  assert.match(dailySessionSource, /<DailySessionEdgeEffects/);
  assert.doesNotMatch(dailySessionSource, />Exit<\/Text>/);
  assert.match(
    stylesSource,
    /dailySessionTitleBlock:\s*\{\s*minWidth:\s*0,\s*width:\s*"100%",/,
  );
  assert.match(
    dailySessionEdgeEffectsSource,
    /accessibilityLabel="Exit episode setup"/,
  );
  assert.match(dailySessionEdgeEffectsSource, /<BackIconButton/);
  assert.match(dailySessionEdgeEffectsSource, /<ScreenEdgeEffects/);
  assert.match(dailySessionEdgeEffectsSource, /bottomVariant="modal"/);
  assert.match(dailySessionEdgeEffectsSource, /topVariant="compact"/);
  assert.match(sharedEdgeEffectsSource, /compactTop:\s*82/);
  assert.match(
    dailySessionEdgeEffectsSource,
    /materialOpacity=\{materialOpacity\}/,
  );
  assert.match(
    dailySessionEdgeEffectsSource,
    /inputRange:\s*\[0, 0\.5, 0\.82, 1\]/,
  );
  assert.match(dailySessionEdgeEffectsSource, /ellipsizeMode="tail"/);
  assert.match(backIconButtonSource, />\s*←\s*<\/Text>/);
  assert.match(backIconButtonStylesSource, /width:\s*44/);
  assert.match(backIconButtonSource, /accessibilityRole="button"/);
});

// The test keeps every app-level Back and Exit action on the shared circular icon contract.
test('Back and Exit navigation reuses BackIconButton across screens', (): void => {
  const navigationSources = [
    '../app/screens/HomeScreen.tsx',
    '../app/screens/SeriesDetailsScreen.tsx',
    '../app/screens/SeriesDetailsEdgeEffects/SeriesDetailsEdgeEffects.tsx',
    '../app/screens/DailySessionEdgeEffects/DailySessionEdgeEffects.tsx',
    '../app/screens/EpisodeReaderScreen.tsx',
  ].map((sourcePath) =>
    readFileSync(resolve(__dirname, sourcePath), 'utf8'),
  );
  const combinedNavigationSource = navigationSources.join('\n');

  assert.equal(
    (combinedNavigationSource.match(/<BackIconButton/g) ?? []).length,
    6,
  );
  assert.doesNotMatch(
    combinedNavigationSource,
    />\s*(?:Back|Exit|Back to Series)\s*<\/Text>/,
  );
  assert.doesNotMatch(combinedNavigationSource, />\s*←\s*<\/Text>/);
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

// The test protects the shared edge material while Home retains its title-specific transition.
test('Home and create-series share top glass and a gradient-only bottom edge', (): void => {
  const homeRouteSource = readFileSync(
    resolve(__dirname, '../../../app/(tabs)/index.tsx'),
    'utf8',
  );
  const homeScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/HomeScreen.tsx'),
    'utf8',
  );
  const edgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/CollapsingTitleEdgeEffects/CollapsingTitleEdgeEffects.tsx',
    ),
    'utf8',
  );
  const sharedEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/ScreenEdgeEffects/ScreenEdgeEffects.tsx',
    ),
    'utf8',
  );

  assert.match(homeRouteSource, /<RouteScreen isDark=\{isDark\} isEdgeToEdge/);
  assert.match(homeScreenSource, /paddingTop:\s*insets\.top \+ 20/);
  assert.match(homeScreenSource, /<Animated\.ScrollView/);
  assert.match(homeScreenSource, /onScroll=\{handleHomeScroll\}/);
  assert.match(homeScreenSource, /Animated\.timing\(/);
  assert.match(homeScreenSource, /duration:\s*homeTitleTransitionDuration/);
  assert.match(homeScreenSource, /duration:\s*homeMaterialTransitionDuration/);
  assert.match(homeScreenSource, /Easing\.inOut\(Easing\.cubic\)/);
  assert.match(homeScreenSource, /homeHeaderCollapseOffset:\s*number = 38/);
  assert.match(homeScreenSource, /homeHeaderExpandOffset:\s*number = 12/);
  assert.match(homeScreenSource, /<HomeHeader styles=\{styles\} \/>/);
  assert.match(homeScreenSource, /<CollapsingTitleEdgeEffects/);
  assert.match(edgeEffectsSource, /<ScreenEdgeEffects/);
  assert.match(edgeEffectsSource, /inputRange:\s*\[0, 0\.5, 0\.82, 1\]/);
  assert.match(homeScreenSource, /ref=\{modalBlurTargetRef\}/);
  assert.match(homeScreenSource, /<ScreenEdgeEffects/);
  assert.match(homeScreenSource, /blurTarget=\{modalBlurTargetRef\}/);
  assert.match(homeScreenSource, /screenEdgeDepths\.modalBottom/);
  assert.match(homeScreenSource, /bottomVariant="modal"/);
  assert.equal((sharedEdgeEffectsSource.match(/<BlurView/g) ?? []).length, 3);
  assert.equal(
    (sharedEdgeEffectsSource.match(/blurTarget=\{blurTarget\}/g) ?? []).length,
    3,
  );
  assert.equal(
    (sharedEdgeEffectsSource.match(
      /blurMethod="dimezisBlurViewSdk31Plus"/g,
    ) ?? []).length,
    3,
  );
  assert.doesNotMatch(sharedEdgeEffectsSource, /experimentalBlurMethod/);
  assert.match(sharedEdgeEffectsSource, /intensity=\{2\}/);
  assert.match(sharedEdgeEffectsSource, /intensity=\{3\}/);
  assert.match(sharedEdgeEffectsSource, /intensity=\{4\}/);
  assert.doesNotMatch(sharedEdgeEffectsSource, /MaskedView/);
  assert.doesNotMatch(sharedEdgeEffectsSource, /blurOpacity|gradientOpacity/);
  assert.match(sharedEdgeEffectsSource, /opacity:\s*materialOpacity/);
  assert.match(
    sharedEdgeEffectsSource,
    /colors\.modalEdgeFadeBottomGradient/,
  );
});

// The test keeps Settings on the exact Home title, accent, glass, and lower-fade contract.
test('Settings reuses the Home collapsing title edge treatment', (): void => {
  const settingsRouteSource = readFileSync(
    resolve(__dirname, '../../../app/(tabs)/settings.tsx'),
    'utf8',
  );
  const settingsScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/SettingsScreen.tsx'),
    'utf8',
  );
  const collapsingEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/CollapsingTitleEdgeEffects/CollapsingTitleEdgeEffects.tsx',
    ),
    'utf8',
  );

  assert.match(
    settingsRouteSource,
    /<RouteScreen isDark=\{isDark\} isEdgeToEdge/,
  );
  assert.match(settingsScreenSource, /<BlurTargetView ref=\{blurTargetRef\}/);
  assert.match(settingsScreenSource, /<Animated\.ScrollView/);
  assert.match(settingsScreenSource, /onScroll=\{handleSettingsScroll\}/);
  assert.match(settingsScreenSource, /settingsHeaderCollapseOffset:\s*number = 38/);
  assert.match(settingsScreenSource, /settingsHeaderExpandOffset:\s*number = 12/);
  assert.match(settingsScreenSource, /duration:\s*settingsTitleTransitionDuration/);
  assert.match(settingsScreenSource, /duration:\s*settingsMaterialTransitionDuration/);
  assert.match(settingsScreenSource, /paddingTop:\s*insets\.top \+ 20/);
  assert.match(settingsScreenSource, /styles\.homeTitleAccent/);
  assert.match(settingsScreenSource, /<CollapsingTitleEdgeEffects/);
  assert.match(settingsScreenSource, /title="Settings"/);
  assert.match(collapsingEdgeEffectsSource, /<ScreenEdgeEffects/);
  assert.match(
    collapsingEdgeEffectsSource,
    /inputRange:\s*\[0, 0\.5, 0\.82, 1\]/,
  );
});

// The test protects Wi-Fi-style series navigation where the large title scrolls unchanged beneath fixed controls.
test('series details reveals only a compact title inside shared top glass', (): void => {
  const seriesRouteSource = readFileSync(
    resolve(__dirname, '../../../app/series-details.tsx'),
    'utf8',
  );
  const seriesScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/SeriesDetailsScreen.tsx'),
    'utf8',
  );
  const seriesEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/SeriesDetailsEdgeEffects/SeriesDetailsEdgeEffects.tsx',
    ),
    'utf8',
  );

  assert.match(seriesRouteSource, /<RouteScreen isDark=\{isDark\} isEdgeToEdge/);
  assert.match(seriesScreenSource, /<BlurTargetView ref=\{blurTargetRef\}/);
  assert.match(seriesScreenSource, /<Animated\.ScrollView/);
  assert.match(seriesScreenSource, /onScroll=\{handleSeriesScroll\}/);
  assert.match(seriesScreenSource, /onLayout=\{handleSeriesHeaderLayout\}/);
  assert.match(seriesScreenSource, /onLayout=\{handleSeriesTitleLayout\}/);
  assert.match(seriesScreenSource, /getSeriesTitleScrollThresholds/);
  assert.match(seriesScreenSource, /offsetY >= thresholds\.appearanceOffset/);
  assert.match(
    seriesScreenSource,
    /offsetY <= thresholds\.disappearanceOffset/,
  );
  assert.doesNotMatch(seriesScreenSource, /seriesHeaderCollapseOffset/);
  assert.doesNotMatch(seriesScreenSource, /seriesHeaderExpandOffset/);
  assert.match(seriesScreenSource, /duration:\s*seriesHeaderTransitionDuration/);
  assert.match(seriesScreenSource, /screenEdgeDepths\.modalBottom/);
  assert.match(
    seriesScreenSource,
    /paddingTop:\s*insets\.top \+ screenEdgeDepths\.compactTop \+ 2/,
  );
  assert.match(
    seriesScreenSource,
    /blurBottom:\s*insets\.top \+ screenEdgeDepths\.compactTop/,
  );
  assert.doesNotMatch(seriesScreenSource, /largeTitleOpacity/);
  assert.match(seriesScreenSource, /<SeriesDetailsEdgeEffects/);
  assert.match(seriesEdgeEffectsSource, /<ScreenEdgeEffects/);
  assert.match(seriesEdgeEffectsSource, /bottomVariant="modal"/);
  assert.match(seriesEdgeEffectsSource, /topVariant="compact"/);
  assert.match(seriesEdgeEffectsSource, /materialOpacity=\{transitionProgress\}/);
  assert.match(seriesEdgeEffectsSource, /inputRange:\s*\[0, 0\.12, 1\]/);
  assert.match(seriesEdgeEffectsSource, /pointerEvents="box-none"/);
  assert.match(seriesEdgeEffectsSource, /ellipsizeMode="tail"/);
  assert.match(seriesEdgeEffectsSource, /numberOfLines=\{1\}/);
  assert.doesNotMatch(seriesEdgeEffectsSource, /adjustsFontSizeToFit/);
  assert.doesNotMatch(seriesEdgeEffectsSource, /minimumFontScale/);
  assert.match(seriesScreenSource, /ref=\{setupModalBlurTargetRef\}/);
  assert.match(
    seriesScreenSource,
    /blurTarget=\{setupModalBlurTargetRef\}/,
  );
  assert.match(seriesScreenSource, /setupModalContentInsets/);
  assert.match(seriesScreenSource, /screenEdgeDepths\.modalBottom/);
  assert.match(seriesScreenSource, /setupModalHeaderPosition/);
  assert.match(seriesScreenSource, /isDark=\{isDark\}/);
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
