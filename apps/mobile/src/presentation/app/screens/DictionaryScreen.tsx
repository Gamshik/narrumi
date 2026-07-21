import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  Keyboard,
  type LayoutChangeEvent,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { VocabularyItem } from '@domain/index';
import { getPreferredPhonetics } from '@presentation/app/vocabulary';
import type { AppColors } from '@presentation/theme';

import { localAppServices } from '../services/localAppServices';
import { JellyPressable, LevelBadge } from '../shared';
import type { AppStyles, LevelFilter } from '../types';
import {
  DictionaryLevelFilterButton,
  DictionaryLevelFilterPopover,
  DictionarySearchIcon,
} from './dictionary';

// dictionaryRowHeight mirrors the fixed compact row height used to place native scroll fades.
const dictionaryRowHeight: number = 62;
// dictionaryRowGap mirrors the visual breathing room between compact word bubbles.
const dictionaryRowGap: number = 5;
// dictionaryListTopPadding reserves the initial resting space beneath the floating search glass.
const dictionaryListTopPadding: number = 82;
// dictionaryEdgeDepth keeps top exit and bottom entrance motion deliberately symmetrical.
const dictionaryEdgeDepth: number = 44;
// dictionaryTopOcclusionHeight starts recession when a row passes beneath the search glass.
const dictionaryTopOcclusionHeight: number = 72;
// dictionaryBottomOcclusionHeight moves the visible lower edge above the floating tab bar.
const dictionaryBottomOcclusionHeight: number = 102;
// dictionaryRowStride is the fixed virtualized distance occupied by one row and its following gap.
const dictionaryRowStride: number = dictionaryRowHeight + dictionaryRowGap;

// DictionaryItemLayout is the fixed geometry returned to FlatList for stable Android virtualization.
type DictionaryItemLayout = {
  // index is the requested item position in the catalog.
  readonly index: number;
  // length is the fixed row-plus-gap stride used by the virtualized list.
  readonly length: number;
  // offset is the row's virtual position before content-container padding.
  readonly offset: number;
};
// DictionaryScreenProps defines the dictionary list screen dependencies.
type DictionaryScreenProps = {
  // colors supplies theme-aware depth for the framed scroll viewport.
  readonly colors: AppColors;
  // isDark selects the correct live blur tint for floating dictionary glass.
  readonly isDark: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectWord opens native details for the selected domain item.
  readonly onSelectWord: (word: VocabularyItem) => void;
};

// StyledViewProps is used by small static dictionary subcomponents.
type StyledViewProps = {
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// SearchBarProps defines controlled search input state for local vocabulary lookup.
type SearchBarProps = {
  // colors supplies translucent search material and filter state colors.
  readonly colors: AppColors;
  // isLoading gives the placeholder honest local catalog status.
  readonly isLoading: boolean;
  // level is displayed by the compact filter affordance when active.
  readonly level: LevelFilter;
  // search is the current text used to filter local vocabulary.
  readonly search: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // wordCount gives the idle search field useful catalog scope.
  readonly wordCount: number;
  // onChangeSearch updates the dictionary query text.
  readonly onChangeSearch: (search: string) => void;
  // onOpenLevelFilter presents the compact glass CEFR palette.
  readonly onOpenLevelFilter: () => void;
};

// DictionaryContentProps defines the loaded/error/list states for catalog results.
type DictionaryContentProps = {
  // colors supplies the dimensional list frame palette.
  readonly colors: AppColors;
  // errorMessage is shown when the bundled catalog cannot be read.
  readonly errorMessage: string | undefined;
  // isLoading distinguishes initial catalog loading from an empty result.
  readonly isLoading: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // words are normalized vocabulary items returned by the use case.
  readonly words: readonly VocabularyItem[];
  // onSelectWord opens details for a selected row.
  readonly onSelectWord: (word: VocabularyItem) => void;
};

// StateMessageProps defines a compact empty/error state.
type StateMessageProps = {
  // message is the primary user-facing state text.
  readonly message: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// DictionaryWordRowProps defines one tappable dictionary catalog row.
type DictionaryWordRowProps = {
  // colors supplies the restrained internal light gradient for the compact word surface.
  readonly colors: AppColors;
  // onPress selects the row for native details.
  readonly onPress: () => void;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // word is the normalized vocabulary item displayed by the row.
  readonly word: VocabularyItem;
};

// DictionaryDepthCellProps describes one row that dissolves itself at the list edges.
type DictionaryDepthCellProps = {
  // children is the complete interactive word bubble kept above the atmospheric background.
  readonly children: ReactNode;
  // index locates the fixed-height cell inside the virtualized vocabulary catalog.
  readonly index: number;
  // scrollY is the native-driven shared scroll position for all visible cells.
  readonly scrollY: Animated.Value;
  // viewportHeight is the currently visible list height between filters and navigation.
  readonly viewportHeight: number;
};

export function DictionaryScreen({
  colors,
  isDark,
  styles,
  onSelectWord,
}: DictionaryScreenProps): ReactElement {
  const [level, setLevel] = useState<LevelFilter>('ALL');
  const [search, setSearch] = useState('');
  const [words, setWords] = useState<readonly VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLevelFilterVisible, setIsLevelFilterVisible] =
    useState<boolean>(false);

  useEffect(() => {
    // Filters can change while the catalog promise is resolving; ignore stale
    // responses so older searches do not overwrite the latest list.
    let isActive = true;

    setIsLoading(true);
    setErrorMessage(undefined);

    void localAppServices.browseVocabulary
      .execute({
        ...(level === 'ALL' ? {} : { level }),
        ...(search.trim() ? { search } : {}),
      })
      .then((items) => {
        if (isActive) {
          setWords(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('The bundled dictionary could not be loaded.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [level, search]);

  // handleOpenLevelFilter clears the software keyboard before revealing the nearby level palette.
  const handleOpenLevelFilter = (): void => {
    Keyboard.dismiss();
    setIsLevelFilterVisible(true);
  };

  return (
    <View style={styles.dictionaryScreen}>
      <DictionaryHeader styles={styles} />
      <View style={styles.dictionaryWorkspace}>
        <DictionaryContent
          colors={colors}
          errorMessage={errorMessage}
          isLoading={isLoading}
          key={`${level}:${search}`}
          styles={styles}
          words={words}
          onSelectWord={onSelectWord}
        />
        {Platform.OS === 'android' ? (
          <LinearGradient
            colors={colors.edgeFadeBottomGradient}
            locations={[0, 0.52, 1]}
            pointerEvents="none"
            style={styles.dictionaryAndroidBottomFade}
          />
        ) : null}
        <View pointerEvents="box-none" style={styles.dictionarySearchOverlay}>
          <SearchBar
            colors={colors}
            isLoading={isLoading}
            level={level}
            search={search}
            styles={styles}
            wordCount={words.length}
            onChangeSearch={setSearch}
            onOpenLevelFilter={handleOpenLevelFilter}
          />
        </View>
        <DictionaryLevelFilterPopover
          colors={colors}
          isDark={isDark}
          level={level}
          visible={isLevelFilterVisible}
          onChangeLevel={setLevel}
          onClose={() => setIsLevelFilterVisible(false)}
        />
      </View>
    </View>
  );
}

// DictionaryHeader renders the screen title without Oxford-specific marketing text.
function DictionaryHeader({ styles }: StyledViewProps): ReactElement {
  return (
    <View style={styles.dictionaryHeader}>
      <View style={styles.homeTitleBlock}>
        <Text style={[styles.largeTitle, styles.homeTitle]}>Dictionary</Text>
        <View style={styles.homeTitleAccent} />
      </View>
    </View>
  );
}

// SearchBar renders a controlled local search field for bundled vocabulary.
function SearchBar({
  colors,
  isLoading,
  level,
  search,
  styles,
  wordCount,
  onChangeSearch,
  onOpenLevelFilter,
}: SearchBarProps): ReactElement {
  // searchInputRef lets the leading bubble act as a genuine focus affordance.
  const searchInputRef = useRef<TextInput>(null);
  // isSearchFocused drives the bubble release and return choreography.
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  // searchPlaceholder replaces a separate counter while preserving useful catalog context.
  const searchPlaceholder: string = isLoading
    ? 'Loading local catalog…'
    : `Search ${wordCount.toLocaleString()} words…`;
  // materialColors use opaque semantic fills on Android to prevent list text bleeding through the search surface.
  const materialColors: readonly [string, string] =
    Platform.OS === 'android'
      ? [colors.backgroundTertiary, colors.backgroundSecondary]
      : [colors.bubbleSurfaceRaised, colors.bubbleSurface];

  // handleSearchIconPress moves focus into the input from the larger bubble touch target.
  const handleSearchIconPress = (): void => {
    searchInputRef.current?.focus();
  };

  return (
    <View style={styles.searchBarShell}>
      <View style={styles.searchBar}>
        <LinearGradient
          colors={materialColors}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.searchBarMaterial}
        />
        <DictionarySearchIcon
          colors={colors}
          isFocused={isSearchFocused}
          onPress={handleSearchIconPress}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onBlur={() => setIsSearchFocused(false)}
          onChangeText={onChangeSearch}
          onFocus={() => setIsSearchFocused(true)}
          placeholder={searchPlaceholder}
          placeholderTextColor={styles.placeholder.color}
          ref={searchInputRef}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 ? (
          <JellyPressable
            accessibilityLabel="Clear vocabulary search"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => onChangeSearch('')}
          >
            <Text style={styles.clearSearch}>×</Text>
          </JellyPressable>
        ) : null}
        <DictionaryLevelFilterButton
          colors={colors}
          level={level}
          onPress={onOpenLevelFilter}
        />
      </View>
    </View>
  );
}

// DictionaryContent selects the correct list, empty, or error state.
function DictionaryContent({
  colors,
  errorMessage,
  isLoading,
  styles,
  words,
  onSelectWord,
}: DictionaryContentProps): ReactElement {
  // scrollY drives edge recession on the native thread and remains stable through lazy state initialization.
  const [scrollY] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // viewportHeight lets bottom-edge rows reveal relative to the actual device space.
  const [viewportHeight, setViewportHeight] = useState<number>(0);

  // handleListLayout records the available viewport after surrounding controls are laid out.
  const handleListLayout = (event: LayoutChangeEvent): void => {
    const nextViewportHeight: number = event.nativeEvent.layout.height;
    setViewportHeight((currentHeight: number): number =>
      currentHeight === nextViewportHeight ? currentHeight : nextViewportHeight,
    );
  };

  if (errorMessage) {
    return (
      <View style={styles.dictionaryStateViewport}>
        <StateMessage message={errorMessage} styles={styles} />
      </View>
    );
  }

  if (!isLoading && words.length === 0) {
    return (
      <View style={styles.dictionaryStateViewport}>
        <StateMessage message="No vocabulary matches found." styles={styles} />
      </View>
    );
  }

  return (
    <View style={styles.dictionaryListViewport}>
      <View style={styles.dictionaryScrollViewport} onLayout={handleListLayout}>
        <Animated.FlatList<VocabularyItem>
          contentContainerStyle={styles.wordList}
          data={words}
          getItemLayout={getDictionaryItemLayout}
          initialNumToRender={24}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          removeClippedSubviews={Platform.OS !== 'android'}
          scrollEventThrottle={16}
          style={styles.flex}
          renderItem={({ index, item }) => (
            <DictionaryDepthCell
              index={index}
              scrollY={scrollY}
              viewportHeight={viewportHeight}
            >
              <DictionaryWordRow
                colors={colors}
                styles={styles}
                word={item}
                onPress={() => onSelectWord(item)}
              />
            </DictionaryDepthCell>
          )}
        />
      </View>
    </View>
  );
}

// DictionaryDepthCell makes the card itself recede instead of drawing a shadow over its text.
function DictionaryDepthCell({
  children,
  index,
  scrollY,
  viewportHeight,
}: DictionaryDepthCellProps): ReactElement {
  if (Platform.OS === 'android' || viewportHeight <= 0) {
    return <View>{children}</View>;
  }

  // rowTop is the stable virtual position produced by fixed compact cells and spacing.
  const rowTop: number =
    dictionaryListTopPadding + index * dictionaryRowStride;
  // bottomBoundary places the perceived viewport above navigation while guarding very short layouts.
  const bottomBoundary: number = Math.max(
    viewportHeight - dictionaryBottomOcclusionHeight,
    dictionaryRowHeight + dictionaryEdgeDepth,
  );
  // bottomFadeStart begins the inverted depth effect as a row enters above the floating tab bar.
  const bottomFadeStart: number = rowTop - bottomBoundary;
  // bottomFadeEnd mirrors the exact distance used by the upper recession.
  const bottomFadeEnd: number = bottomFadeStart + dictionaryEdgeDepth;
  // topFadeStart begins only when a row actually passes underneath the floating search material.
  const topFadeStart: number = Math.max(
    rowTop - dictionaryTopOcclusionHeight,
    bottomFadeEnd + 1,
    0,
  );
  // topFadeEnd completes the symmetric recession inside the glass-covered region.
  const topFadeEnd: number = topFadeStart + dictionaryEdgeDepth;
  // opacity dissolves only the cell, so controls and the word count can never be obscured.
  const opacity: Animated.AnimatedInterpolation<number> = scrollY.interpolate({
    inputRange: [
      bottomFadeStart,
      bottomFadeEnd,
      topFadeStart,
      topFadeEnd,
    ],
    outputRange: [0.04, 1, 1, 0.04],
    extrapolate: 'clamp',
  });
  // scale adds a restrained depth cue while avoiding the appearance of a moving overlay plate.
  const scale: Animated.AnimatedInterpolation<number> = scrollY.interpolate({
    inputRange: [
      bottomFadeStart,
      bottomFadeEnd,
      topFadeStart,
      topFadeEnd,
    ],
    outputRange: [0.98, 1, 1, 0.98],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}

// StateMessage renders a compact fallback for empty and failed dictionary states.
function StateMessage({
  message,
  styles,
}: StateMessageProps): ReactElement {
  return (
    <View style={styles.stateMessage}>
      <Text style={styles.stateMessageTitle}>{message}</Text>
      <Text style={styles.secondaryText}>Try another filter or search query.</Text>
    </View>
  );
}

// DictionaryWordRow renders a dictionary-specific row, separate from future study cards.
function DictionaryWordRow({
  colors,
  onPress,
  styles,
  word,
}: DictionaryWordRowProps): ReactElement {
  // materialColors keep Android rows opaque enough for reliable clipping and translucent elsewhere.
  const materialColors: readonly [string, string] =
    Platform.OS === 'android'
      ? [colors.backgroundTertiary, colors.backgroundSecondary]
      : [colors.bubbleSurfaceRaised, colors.bubbleSurface];

  return (
    <JellyPressable
      onPress={onPress}
      pressAnimationDelayMs={70}
      style={({ pressed }) => [styles.wordRow, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={materialColors}
        end={{ x: 0.78, y: 1 }}
        pointerEvents="none"
        start={{ x: 0.16, y: 0 }}
        style={styles.wordRowGradient}
      />
      <View
        style={[
          styles.wordLevelRail,
          getWordLevelRailStyle(styles, word.level),
        ]}
      />
      <View style={styles.flex}>
        <View style={styles.wordHeading}>
          <Text numberOfLines={1} style={styles.wordTitle}>
            {word.word}
          </Text>
          <Text numberOfLines={1} style={styles.partOfSpeech}>
            {word.partOfSpeech}
          </Text>
        </View>
        <Text style={styles.phonetics}>
          {getPreferredPhonetics(word)}
        </Text>
      </View>
      <LevelBadge level={word.level} styles={styles} />
    </JellyPressable>
  );
}

// getDictionaryItemLayout prevents Android from estimating fixed row positions while cells animate or recycle.
function getDictionaryItemLayout(
  _words: ArrayLike<VocabularyItem> | null | undefined,
  index: number,
): DictionaryItemLayout {
  return {
    index,
    length: dictionaryRowStride,
    offset: dictionaryRowStride * index,
  };
}

// getWordLevelRailStyle maps CEFR progression to one narrow scanning accent.
function getWordLevelRailStyle(
  styles: AppStyles,
  level: VocabularyItem['level'],
): AppStyles['wordLevelA1'] {
  switch (level) {
    case 'A1':
      return styles.wordLevelA1;
    case 'A2':
      return styles.wordLevelA2;
    case 'B1':
      return styles.wordLevelB1;
    case 'B2':
      return styles.wordLevelB2;
    case 'C1':
      return styles.wordLevelC1;
    case 'C2':
      return styles.wordLevelC2;
  }
}
