import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import type { VocabularyItem } from '@domain/index';
import { JellyPressable } from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';
import { getPreferredPhonetics } from '@presentation/app/vocabulary';
import type { AppColors } from '@presentation/theme';

import { getDictionaryPickerSummary } from './dictionaryPickerCopy';
import { dictionaryPickerPanelStyles as panelStyles } from './DictionaryPickerPanel.styles';
import { useDictionaryPickerTransition } from './useDictionaryPickerTransition';

// pickerRowHeight mirrors the fixed compact result surface used for depth motion.
const pickerRowHeight: number = 68;
// pickerRowGap mirrors the stable spacing between picker result bubbles.
const pickerRowGap: number = 8;
// pickerListPadding keeps the first result clear of the rounded viewport edge.
const pickerListPadding: number = 6;
// pickerTopEdgeDepth keeps the upper recession readable beneath the picker frame.
const pickerTopEdgeDepth: number = 36;
// pickerBottomEdgeDepth shortens lower entry so results remain close to the visible edge.
const pickerBottomEdgeDepth: number = 12;

// DictionaryPickerPanelProps defines one local dictionary replacement picker.
export type DictionaryPickerPanelProps = {
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // isChoosing disables duplicate writes while the selected word is saved.
  readonly isChoosing: boolean;
  // isLoading distinguishes dictionary lookup from an empty result.
  readonly isLoading: boolean;
  // reduceMotion replaces decorative panel travel with an immediate state change.
  readonly reduceMotion: boolean;
  // search is the controlled local dictionary query.
  readonly search: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // targetWord is the current Story Word slot being replaced.
  readonly targetWord: VocabularyItem | undefined;
  // words are local dictionary results available for this slot.
  readonly words: readonly VocabularyItem[];
  // onChangeSearch updates the local dictionary query.
  readonly onChangeSearch: (search: string) => void;
  // onChooseWord persists one explicit dictionary choice and reports whether it succeeded.
  readonly onChooseWord: (wordId: string) => Promise<boolean>;
  // onClose releases the picker only after its exit transition completes.
  readonly onClose: () => void;
};

// DictionaryPickerPanel lets users choose one Story Word from the bundled catalog.
export function DictionaryPickerPanel({
  colors,
  isChoosing,
  isLoading,
  reduceMotion,
  search,
  styles,
  targetWord,
  words,
  onChangeSearch,
  onChooseWord,
  onClose,
}: DictionaryPickerPanelProps): ReactElement {
  const {
    closePicker,
    contentOpacity,
    contentTranslateY,
    isClosing,
    surfaceOpacity,
    surfaceScale,
    surfaceTranslateY,
  } = useDictionaryPickerTransition(reduceMotion, onClose);
  // scrollY drives the same native row recession used by the main Dictionary.
  const [scrollY] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // viewportHeight anchors lower-edge depth to the rendered picker container.
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  // targetWordLabel preserves picker context while a successful replacement exits.
  const [targetWordLabel] = useState<string>(
    (): string => targetWord?.word ?? 'selected word',
  );
  // wordRowStyle applies the active bubble material to compact dictionary rows.
  const wordRowStyle: ViewStyle = {
    backgroundColor: colors.bubbleSurfaceMuted,
    borderColor: colors.bubbleBorder,
  };
  // listViewportStyle makes the independently scrollable region visually explicit.
  const listViewportStyle: ViewStyle = {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.pillBorder,
  };
  // resultSummaryStyle keeps the picker status quiet but readable.
  const resultSummaryStyle: TextStyle = {
    color: colors.labelSecondary,
  };
  // wordPhoneticsStyle gives pronunciation the same semantic accent as Dictionary.
  const wordPhoneticsStyle: TextStyle = {
    color: colors.systemOrange,
  };
  // wordPartOfSpeechStyle keeps grammatical metadata intentionally quieter.
  const wordPartOfSpeechStyle: TextStyle = {
    color: colors.labelTertiary,
  };
  // handleListLayout keeps depth calculations aligned with the bounded viewport.
  const handleListLayout = (event: LayoutChangeEvent): void => {
    const nextViewportHeight: number = event.nativeEvent.layout.height;

    setViewportHeight((currentHeight: number): number =>
      currentHeight === nextViewportHeight ? currentHeight : nextViewportHeight,
    );
  };
  // chooseWord closes through the same material transition only after local persistence succeeds.
  const chooseWord = async (wordId: string): Promise<void> => {
    const wasChosen: boolean = await onChooseWord(wordId);

    if (wasChosen) {
      closePicker();
    }
  };

  return (
    <Animated.View
      pointerEvents={isClosing ? 'none' : 'auto'}
      style={[
        styles.settingsCard,
        {
          opacity: surfaceOpacity,
          transform: [
            { translateY: surfaceTranslateY },
            { scale: surfaceScale },
          ],
        },
      ]}
    >
      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        }}
      >
        <View style={panelStyles.header}>
        <View style={styles.flex}>
          <Text style={styles.actionTitle}>Choose from Dictionary</Text>
          <Text style={styles.secondaryText}>
            Replacing{' '}
            <Text style={panelStyles.targetWord}>
              {targetWordLabel}
            </Text>
            .
          </Text>
        </View>
        <JellyPressable
          onPress={closePicker}
          style={({ pressed }) => [
            styles.secondarySmallButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondarySmallButtonText}>Close</Text>
        </JellyPressable>
      </View>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeSearch}
          placeholder="Search dictionary..."
          placeholderTextColor={styles.placeholder.color}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 ? (
          <JellyPressable onPress={() => onChangeSearch('')} hitSlop={10}>
            <Text style={styles.clearSearch}>×</Text>
          </JellyPressable>
        ) : null}
      </View>
      <Text style={[panelStyles.resultSummary, resultSummaryStyle]}>
        {getDictionaryPickerSummary({
          isLoading,
          search,
          visibleWordCount: words.length,
        })}
      </Text>

      <View
        onLayout={handleListLayout}
        style={[panelStyles.listViewport, listViewportStyle]}
      >
        <LinearGradient
          colors={[colors.bubbleSurfaceRaised, colors.bubbleSurfaceMuted]}
          end={{ x: 0.8, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.1, y: 0 }}
          style={panelStyles.listMaterial}
        />
        <Animated.ScrollView
          contentContainerStyle={panelStyles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator
          style={panelStyles.listScroll}
        >
          {!isLoading && words.length === 0 ? (
            <View style={panelStyles.emptyState}>
              <Text style={styles.actionTitle}>
                {search.trim()
                  ? 'No words found'
                  : 'No dictionary words available'}
              </Text>
              <Text style={styles.secondaryText}>
                {search.trim()
                  ? 'Try a shorter spelling or a different word.'
                  : 'Close the picker and try again.'}
              </Text>
            </View>
          ) : null}

          {words.map((word, index) => (
            <DictionaryPickerDepthCell
              index={index}
              key={word.id}
              scrollY={scrollY}
              viewportHeight={viewportHeight}
            >
              <JellyPressable
                accessibilityHint="Replaces the current Story Word"
                accessibilityLabel={`Choose ${word.word}`}
                disabled={isChoosing}
                onPress={() => {
                  void chooseWord(word.id);
                }}
                pressedOpacityTo={0.9}
                scaleTo={0.96}
                style={({ pressed }) => [
                  panelStyles.wordRow,
                  wordRowStyle,
                  isChoosing && styles.disabledControl,
                  pressed && panelStyles.wordRowPressed,
                ]}
              >
                <LinearGradient
                  colors={[colors.bubbleSurfaceRaised, colors.bubbleSurface]}
                  end={{ x: 0.78, y: 1 }}
                  pointerEvents="none"
                  start={{ x: 0.16, y: 0 }}
                  style={panelStyles.wordRowGradient}
                />
                <View
                  style={[
                    panelStyles.wordLevelRail,
                    getWordLevelRailStyle(colors, word.level),
                  ]}
                />
                <View style={styles.flex}>
                  <View style={panelStyles.wordHeading}>
                    <Text numberOfLines={1} style={styles.wordTitle}>
                      {word.word}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        panelStyles.wordPartOfSpeech,
                        wordPartOfSpeechStyle,
                      ]}
                    >
                      {word.partOfSpeech}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[panelStyles.wordPhonetics, wordPhoneticsStyle]}
                  >
                    {getPreferredPhonetics(word)}
                  </Text>
                </View>
              </JellyPressable>
            </DictionaryPickerDepthCell>
          ))}
        </Animated.ScrollView>
      </View>
      </Animated.View>
    </Animated.View>
  );
}

// DictionaryPickerDepthCellProps describes one result that recedes at viewport edges.
type DictionaryPickerDepthCellProps = {
  // children is the complete interactive result bubble.
  readonly children: ReactElement;
  // index locates the fixed-height result within picker content.
  readonly index: number;
  // scrollY is the native-driven picker scroll position.
  readonly scrollY: Animated.Value;
  // viewportHeight is the measured bounded list height.
  readonly viewportHeight: number;
};

// DictionaryPickerDepthCell mirrors Dictionary's opacity-and-scale edge effect.
function DictionaryPickerDepthCell({
  children,
  index,
  scrollY,
  viewportHeight,
}: DictionaryPickerDepthCellProps): ReactElement {
  if (viewportHeight <= 0) {
    return <View>{children}</View>;
  }

  // rowTop is the result's stable virtual position inside the fixed-height list.
  const rowTop: number =
    pickerListPadding + index * (pickerRowHeight + pickerRowGap);
  // bottomBoundary starts recession one row above the rounded lower edge.
  const bottomBoundary: number = Math.max(
    viewportHeight - pickerRowHeight,
    pickerRowHeight + pickerBottomEdgeDepth,
  );
  // bottomFadeStart begins the entrance as a result approaches the viewport.
  const bottomFadeStart: number = rowTop - bottomBoundary;
  // bottomFadeEnd completes the lower-edge entrance over one restrained depth span.
  const bottomFadeEnd: number = bottomFadeStart + pickerBottomEdgeDepth;
  // topFadeStart waits until the result reaches the visible upper boundary.
  const topFadeStart: number = Math.max(rowTop, bottomFadeEnd + 1, 0);
  // topFadeEnd preserves a deeper upper exit beneath the framed surface.
  const topFadeEnd: number = topFadeStart + pickerTopEdgeDepth;
  // opacity mirrors the same card recession at both edges while preserving the shorter lower span.
  const opacity: Animated.AnimatedInterpolation<number> = scrollY.interpolate({
    inputRange: [bottomFadeStart, bottomFadeEnd, topFadeStart, topFadeEnd],
    outputRange: [0.08, 1, 1, 0.08],
    extrapolate: 'clamp',
  });
  // scale uses one identical depth endpoint so neither edge changes the card material differently.
  const scale: Animated.AnimatedInterpolation<number> = scrollY.interpolate({
    inputRange: [bottomFadeStart, bottomFadeEnd, topFadeStart, topFadeEnd],
    outputRange: [0.98, 1, 1, 0.98],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}

// getWordLevelRailStyle maps CEFR progression to Dictionary's scanning accents.
function getWordLevelRailStyle(
  colors: AppColors,
  level: VocabularyItem['level'],
): ViewStyle {
  // levelColors preserves the same semantic progression as the main Dictionary.
  const levelColors: Record<VocabularyItem['level'], string> = {
    A1: colors.systemGreen,
    A2: colors.systemTeal,
    B1: colors.systemOrange,
    B2: colors.systemPurple,
    C1: colors.systemPink,
    C2: colors.systemBlue,
  };

  return { backgroundColor: levelColors[level] };
}
