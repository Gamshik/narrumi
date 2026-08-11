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

// The test callback keeps the extracted saved-series interaction compact and progressive.
test('home saved-series swipe card remains compact and intentional', (): void => {
  const appStylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );
  const homeScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/HomeScreen.tsx'),
    'utf8',
  );
  const cardSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/home/components/SwipeableSeriesCard/SwipeableSeriesCard.tsx',
    ),
    'utf8',
  );
  const cardStylesSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/home/components/SwipeableSeriesCard/SwipeableSeriesCard.styles.ts',
    ),
    'utf8',
  );
  const deleteActionSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/home/components/SwipeableSeriesCard/SeriesDeleteAction/SeriesDeleteAction.tsx',
    ),
    'utf8',
  );
  const rootLayoutSource = readFileSync(
    resolve(__dirname, '../../../app/_layout.tsx'),
    'utf8',
  );

  assert.match(appStylesSource, /seriesListGrid:\s*\{\s*gap:\s*10,/);
  assert.match(cardStylesSource, /cardSurface:\s*\{[\s\S]*?height:\s*88,/);
  assert.match(cardStylesSource, /title:\s*\{[\s\S]*?fontSize:\s*16,[\s\S]*?lineHeight:\s*23,/);
  assert.match(cardStylesSource, /meta:\s*\{[\s\S]*?fontSize:\s*13,[\s\S]*?lineHeight:\s*19,/);
  assert.match(cardSource, /<ReanimatedSwipeable/);
  assert.match(cardSource, /overshootRight=\{false\}/);
  assert.match(cardSource, /dragOffsetFromRightEdge=\{seriesSwipeActivationDistance\}/);
  assert.match(cardSource, /ReduceMotion\.System/);
  assert.match(deleteActionSource, /<Animated\.Text[\s\S]*?DELETE[\s\S]*?<\/Animated\.Text>/);
  assert.match(deleteActionSource, /styles\.materialGradient/);
  assert.match(deleteActionSource, /styles\.halo/);
  assert.match(deleteActionSource, /styles\.sheen/);
  assert.match(deleteActionSource, /styles\.orbShell/);
  assert.match(deleteActionSource, /withSpring\(1, actionPressSpring\)/);
  assert.match(cardSource, /width=\{seriesSwipeActionWidth\}/);
  assert.doesNotMatch(cardSource, /JellyPressable|scaleTo=/);
  assert.match(cardStylesSource, /cardPressablePressed:\s*\{\s*opacity:\s*0\.96,/);
  assert.match(
    cardSource,
    /backgroundColor:\s*colors\.bubbleSurfaceRaised/,
  );
  assert.match(cardSource, /name: 'delete', label: 'Delete series'/);
  assert.match(
    cardStylesSource,
    /swipeContainer:\s*\{[\s\S]*?borderRadius:\s*radii\.lg,[\s\S]*?overflow:\s*'hidden',/,
  );
  assert.match(rootLayoutSource, /<GestureHandlerRootView style=\{\{ flex: 1 \}\}>/);
  assert.doesNotMatch(cardSource, /PanResponder|useSeriesSwipeGesture/);
  assert.doesNotMatch(homeScreenSource, /scrollEnabled=\{!isSeriesSwipeActive\}/);
  assert.match(homeScreenSource, /<SwipeableSeriesCard/);
  assert.doesNotMatch(homeScreenSource, /SwipeToDeleteWrapper/);
  assert.doesNotMatch(homeScreenSource, /isFeatured/);
  assert.doesNotMatch(appStylesSource, /seriesCardFeatured/);
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
  const sharedEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/ScreenEdgeEffects/ScreenEdgeEffects.tsx',
    ),
    'utf8',
  );
  const dailySessionEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/DailySessionEdgeEffects/DailySessionEdgeEffects.tsx',
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
  assert.match(
    dailySessionSource,
    /<PlatformBlurTargetView[\s\S]*?blurTargetRef=\{blurTargetRef\}/,
  );
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
    '../app/screens/home/components/CreateSeriesFlow/CreateSeriesFlow.tsx',
    '../app/screens/SeriesDetailsScreen.tsx',
    '../app/screens/SeriesDetailsEdgeEffects/SeriesDetailsEdgeEffects.tsx',
    '../app/screens/DailySessionEdgeEffects/DailySessionEdgeEffects.tsx',
    '../app/screens/EpisodeReaderScreen.tsx',
    '../app/screens/EpisodeReaderEdgeEffects/EpisodeReaderEdgeEffects.tsx',
  ].map((sourcePath) =>
    readFileSync(resolve(__dirname, sourcePath), 'utf8'),
  );
  const combinedNavigationSource = navigationSources.join('\n');

  assert.equal(
    (combinedNavigationSource.match(/<BackIconButton/g) ?? []).length,
    7,
  );
  assert.doesNotMatch(
    combinedNavigationSource,
    />\s*(?:Back|Exit|Back to Series)\s*<\/Text>/,
  );
  assert.doesNotMatch(combinedNavigationSource, />\s*←\s*<\/Text>/);
});

// The test keeps focused episode metadata in the header for both Reader modes.
test('reader header follows focused metadata without hiding full-series headings', (): void => {
  const readerSource = readFileSync(
    resolve(__dirname, '../app/screens/EpisodeReaderScreen.tsx'),
    'utf8',
  );
  const readerEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/EpisodeReaderEdgeEffects/EpisodeReaderEdgeEffects.tsx',
    ),
    'utf8',
  );
  const readerEdgeEffectStylesSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/EpisodeReaderEdgeEffects/EpisodeReaderEdgeEffects.styles.ts',
    ),
    'utf8',
  );
  const readerRouteSource = readFileSync(
    resolve(__dirname, '../../../app/episode-reader.tsx'),
    'utf8',
  );
  const dailySessionSource = readFileSync(
    resolve(__dirname, '../app/screens/DailySessionScreen.tsx'),
    'utf8',
  );
  const sharedEdgeEffectsSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/ScreenEdgeEffects/ScreenEdgeEffects.tsx',
    ),
    'utf8',
  );

  assert.match(readerSource, /const isSingleEpisode: boolean = episodes\.length === 1/);
  assert.match(readerSource, /EPISODE \{activeEpisode\.orderIndex\}/);
  assert.match(readerSource, /activeEpisode\.title \?\? 'Untitled Episode'/);
  assert.match(readerSource, /!isSingleEpisode \? \(/);
  assert.match(readerSource, /getFocusedEpisodeHeaderIndex/);
  assert.match(readerSource, /style=\{styles\.readerEpisodeBadge\}/);
  assert.match(readerSource, /style=\{styles\.readerEpisodeTitle\}/);
  assert.doesNotMatch(readerSource, /!isSingleEpisode[\s\S]{0,120}largeTitleOpacity/);
  assert.match(readerRouteSource, /<RouteScreen isDark=\{isDark\} isEdgeToEdge/);
  assert.match(
    readerSource,
    /<PlatformBlurTargetView[\s\S]*?blurTargetRef=\{blurTargetRef\}/,
  );
  assert.match(readerSource, /<Animated\.ScrollView/);
  assert.match(readerSource, /<EpisodeReaderEdgeEffects/);
  assert.match(readerSource, /paddingTop: insets\.top \+ screenEdgeDepths\.readerTop \+ 2/);
  assert.match(readerSource, /paddingBottom: insets\.bottom \+ screenEdgeDepths\.modalBottom \+ 16/);
  assert.match(readerSource, /materialOpacity=\{materialTransition\}/);
  assert.match(readerEdgeEffectsSource, /<ScreenEdgeEffects/);
  assert.match(readerEdgeEffectsSource, /bottomVariant="modal"/);
  assert.match(readerEdgeEffectsSource, /topVariant="reader"/);
  assert.match(sharedEdgeEffectsSource, /readerTop:\s*70/);
  assert.match(readerEdgeEffectsSource, /EPISODE \{episodeNumber\}/);
  assert.match(readerEdgeEffectsSource, /ellipsizeMode="tail"/);
  assert.match(readerEdgeEffectsSource, /numberOfLines=\{1\}/);
  assert.match(readerEdgeEffectStylesSource, /left: 76/);
  assert.match(readerEdgeEffectStylesSource, /right: 76/);
  assert.doesNotMatch(dailySessionSource, /SafeAreaView/);
  assert.doesNotMatch(readerSource, />SERIES READER<\/Text>/);
  assert.doesNotMatch(readerSource, /episodes\.length === 1 \? 'episode' : 'episodes'/);
});

// The test keeps authentication edge depth static and free from background blur.
test('authentication uses shallow gradient-only edge depth', (): void => {
  const authScreenSource = readFileSync(
    resolve(
      __dirname,
      '../app/auth/AuthenticationScreen/AuthenticationScreen.tsx',
    ),
    'utf8',
  );
  const authEdgeSource = readFileSync(
    resolve(
      __dirname,
      '../app/auth/AuthenticationScreen/AuthEdgeGradients/AuthEdgeGradients.tsx',
    ),
    'utf8',
  );
  const authEdgeStylesSource = readFileSync(
    resolve(
      __dirname,
      '../app/auth/AuthenticationScreen/AuthEdgeGradients/AuthEdgeGradients.styles.ts',
    ),
    'utf8',
  );
  const appStylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(authScreenSource, /<AuthEdgeGradients colors=\{colors\} \/>/);
  assert.match(
    authScreenSource,
    /<RouteScreen isDark=\{isDark\} isEdgeToEdge styles=\{styles\}>/,
  );
  assert.match(authScreenSource, /paddingTop: insets\.top \+ 28/);
  assert.match(authScreenSource, /paddingBottom: insets\.bottom \+ 28/);
  assert.match(
    appStylesSource,
    /authTitle:\s*\{[\s\S]*?fontSize:\s*36,[\s\S]*?lineHeight:\s*46,[\s\S]*?paddingVertical:\s*2/,
  );
  assert.equal((authEdgeSource.match(/<LinearGradient/g) ?? []).length, 2);
  assert.match(authEdgeSource, /colors\.edgeFadeTopGradient/);
  assert.match(authEdgeSource, /colors\.modalEdgeFadeBottomGradient/);
  assert.doesNotMatch(authEdgeSource, /BlurView|expo-blur/);
  assert.match(authEdgeStylesSource, /height:\s*84/);
  assert.match(authEdgeStylesSource, /height:\s*72/);
});

// The test protects the Sorbet search, anchored level popover, and symmetric list depth.
test('dictionary uses floating tools and symmetric edge depth', (): void => {
  const dictionarySource = readFileSync(
    resolve(__dirname, '../app/screens/DictionaryScreen.tsx'),
    'utf8',
  );
  const levelButtonSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/dictionary/DictionaryLevelFilterButton/DictionaryLevelFilterButton.tsx',
    ),
    'utf8',
  );
  const levelPopoverSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/dictionary/DictionaryLevelFilterPopover/DictionaryLevelFilterPopover.tsx',
    ),
    'utf8',
  );
  const levelPopoverStylesSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/dictionary/DictionaryLevelFilterPopover/DictionaryLevelFilterPopover.styles.ts',
    ),
    'utf8',
  );
  const searchIconSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/dictionary/DictionarySearchIcon/DictionarySearchIcon.tsx',
    ),
    'utf8',
  );
  const stylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(dictionarySource, /<Animated\.FlatList<VocabularyItem>/);
  assert.match(dictionarySource, /<DictionaryDepthCell/);
  assert.match(dictionarySource, /useNativeDriver:\s*true/);
  assert.match(dictionarySource, /dictionaryBottomOcclusionHeight:\s*number = 102/);
  assert.match(dictionarySource, /dictionaryEdgeDepth:\s*number = 44/);
  assert.match(dictionarySource, /outputRange:\s*\[0\.04, 1, 1, 0\.04\]/);
  assert.match(dictionarySource, /styles\.dictionarySearchOverlay/);
  assert.match(dictionarySource, /colors\.bubbleSurfaceRaised/);
  assert.match(dictionarySource, /<DictionarySearchIcon/);
  assert.match(dictionarySource, /Keyboard\.dismiss\(\)/);
  assert.match(dictionarySource, /<DictionaryLevelFilterButton/);
  assert.match(dictionarySource, /<DictionaryLevelFilterPopover/);
  assert.match(dictionarySource, /useRef<TextInput>\(null\)/);
  assert.match(dictionarySource, /searchInputRef\.current\?\.focus\(\)/);
  assert.match(dictionarySource, /isFocused=\{isSearchFocused\}/);
  assert.match(dictionarySource, /onBlur=\{\(\) => setIsSearchFocused\(false\)\}/);
  assert.match(dictionarySource, /onFocus=\{\(\) => setIsSearchFocused\(true\)\}/);
  assert.match(dictionarySource, /getWordLevelRailStyle/);
  assert.match(dictionarySource, /pressAnimationDelayMs=\{70\}/);
  assert.match(dictionarySource, /getItemLayout=\{getDictionaryItemLayout\}/);
  assert.match(
    dictionarySource,
    /removeClippedSubviews=\{Platform\.OS !== 'android'\}/,
  );
  assert.match(
    dictionarySource,
    /Platform\.OS === 'android' \|\| viewportHeight <= 0/,
  );
  assert.match(dictionarySource, /colors\.edgeFadeBottomGradient/);
  assert.doesNotMatch(dictionarySource, /expo-blur|<BlurView/);
  assert.match(levelButtonSource, /<Svg/);
  assert.match(levelButtonSource, /level !== 'ALL'/);
  assert.match(searchIconSource, /<Circle/);
  assert.match(searchIconSource, /<Path/);
  assert.match(searchIconSource, /<JellyPressable/);
  assert.match(searchIconSource, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(searchIconSource, /satelliteProgress/);
  assert.match(searchIconSource, /tapProgress/);
  assert.match(searchIconSource, /onPressIn=\{handlePressIn\}/);
  assert.match(searchIconSource, /styles\.tapRing/);
  assert.match(searchIconSource, /styles\.tapDropletPrimary/);
  assert.match(searchIconSource, /styles\.tapDropletSecondary/);
  assert.match(searchIconSource, /tapAnimationRef\.current\?\.stop\(\)/);
  assert.match(searchIconSource, /isFocused \? \[1, 13\] : \[13, 1\]/);
  assert.match(searchIconSource, /useNativeDriver:\s*true/);
  assert.match(levelPopoverSource, /<BlurView/);
  assert.match(levelPopoverSource, /Platform\.OS !== 'android'/);
  assert.match(levelPopoverSource, /Animated\.spring/);
  assert.match(levelPopoverSource, /BackHandler\.addEventListener/);
  assert.doesNotMatch(levelPopoverSource, /<Modal|animationType="slide"/);
  assert.match(levelPopoverStylesSource, /top:\s*76/);
  assert.match(levelPopoverStylesSource, /flexBasis:\s*'30%'/);
  assert.match(levelPopoverStylesSource, /flexBasis:\s*'100%'/);
  assert.equal((levelPopoverSource.match(/\{ level:/g) ?? []).length, 7);
  assert.match(stylesSource, /wordList:\s*\{\s*gap:\s*5,/);
  assert.match(
    stylesSource,
    /searchBar:\s*\{[\s\S]*?borderRadius:\s*radii\.lg,[\s\S]*?backgroundColor:\s*colors\.bubbleSurface/,
  );
  assert.match(stylesSource, /wordList:\s*\{[\s\S]*?paddingTop:\s*82,/);
  assert.match(stylesSource, /wordRow:\s*\{[\s\S]*?height:\s*62,/);
  assert.match(stylesSource, /wordRowGradient:/);
  assert.doesNotMatch(dictionarySource, /DictionaryListFades|LevelFilters/);
  assert.doesNotMatch(stylesSource, /filterViewport|counterText/);
  assert.doesNotMatch(stylesSource, /wordRowContainer:/);
  assert.doesNotMatch(stylesSource, /wordRowSheen:/);
  assert.doesNotMatch(dictionarySource, /WORD CATALOG|DictionaryListFrame/);
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
  const createSeriesFlowSource = readFileSync(
    resolve(
      __dirname,
      '../app/screens/home/components/CreateSeriesFlow/CreateSeriesFlow.tsx',
    ),
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
  const platformBlurTargetSource = readFileSync(
    resolve(
      __dirname,
      '../app/shared/PlatformBlurTargetView/PlatformBlurTargetView.tsx',
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
  assert.match(
    createSeriesFlowSource,
    /blurTargetRef=\{blurTargetRef\}/,
  );
  assert.match(createSeriesFlowSource, /<ScreenEdgeEffects/);
  assert.match(createSeriesFlowSource, /blurTarget=\{blurTargetRef\}/);
  assert.match(createSeriesFlowSource, /bottomVariant="modal"/);
  assert.equal((sharedEdgeEffectsSource.match(/<BlurView/g) ?? []).length, 3);
  assert.equal(
    (sharedEdgeEffectsSource.match(/blurTarget=\{blurTarget\}/g) ?? []).length,
    3,
  );
  assert.match(
    sharedEdgeEffectsSource,
    /supportsProgressiveBlur:\s*boolean = Platform\.OS !== 'android'/,
  );
  assert.match(sharedEdgeEffectsSource, /supportsProgressiveBlur \? \(/);
  assert.doesNotMatch(
    sharedEdgeEffectsSource,
    /blurMethod|experimentalBlurMethod/,
  );
  assert.match(platformBlurTargetSource, /Platform\.OS === 'android'/);
  assert.match(platformBlurTargetSource, /<View ref=\{blurTargetRef\}/);
  assert.match(platformBlurTargetSource, /<BlurTargetView ref=\{blurTargetRef\}/);
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
  assert.match(
    settingsScreenSource,
    /<PlatformBlurTargetView[\s\S]*?blurTargetRef=\{blurTargetRef\}/,
  );
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

// The test keeps Dictionary aligned with the shared Home and Settings title treatment.
test('Dictionary reuses the shared title accent treatment', (): void => {
  const dictionaryScreenSource = readFileSync(
    resolve(__dirname, '../app/screens/DictionaryScreen.tsx'),
    'utf8',
  );
  const appStylesSource = readFileSync(
    resolve(__dirname, '../app/MobileApp.styles.ts'),
    'utf8',
  );

  assert.match(dictionaryScreenSource, /styles\.homeTitleBlock/);
  assert.match(dictionaryScreenSource, /styles\.homeTitle\]/);
  assert.match(dictionaryScreenSource, /styles\.homeTitleAccent/);
  assert.match(
    appStylesSource,
    /dictionaryHeader:\s*\{[\s\S]*?marginTop:\s*12,[\s\S]*?paddingHorizontal:\s*20/,
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
  assert.match(
    seriesScreenSource,
    /<PlatformBlurTargetView[\s\S]*?blurTargetRef=\{blurTargetRef\}/,
  );
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
  assert.match(
    seriesScreenSource,
    /blurTargetRef=\{setupModalBlurTargetRef\}/,
  );
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
