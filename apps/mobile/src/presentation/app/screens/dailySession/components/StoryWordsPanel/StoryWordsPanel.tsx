import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  Easing,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import type { VocabularyItem } from '@domain/index';
import {
  JellyPressable,
  useReducedMotionPreference,
} from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';
import type { AppColors } from '@presentation/theme';

import { RandomizeIcon } from './RandomizeIcon';
import { StoryWordCard } from './StoryWordCard';
import { getSelectedStoryWordsLabel } from './storyWordsPanelCopy';
import { storyWordsPanelStyles as panelStyles } from './StoryWordsPanel.styles';
import { useStoryWordsGridTransition } from './useStoryWordsGridTransition';

// shuffleAllRotationDurationMs keeps the global affordance responsive but restrained.
const shuffleAllRotationDurationMs: number = 620;

// StoryWordsPanelProps defines the compact editable Episode Words surface.
export type StoryWordsPanelProps = {
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // isLocked freezes the generation snapshot until the active request settles.
  readonly isLocked: boolean;
  // isShuffling marks only an explicit full-set replacement as a global update.
  readonly isShuffling: boolean;
  // replacingWordId scopes progress feedback to the one locally changing card.
  readonly replacingWordId: string | undefined;
  // styles is the current theme StyleSheet contract shared by the screen.
  readonly styles: AppStyles;
  // words are the resolved visible Story Words selected for the next episode.
  readonly words: readonly VocabularyItem[];
  // onPickWord opens the local dictionary for one editable slot.
  readonly onPickWord: (wordId: string) => void;
  // onReplaceWord changes only one word in the current episode set.
  readonly onReplaceWord: (wordId: string) => void;
  // onShuffleWords replaces the full current episode set by explicit choice.
  readonly onShuffleWords: () => void;
};

// StoryWordsPanel keeps the editable set dense enough to scan as one group.
export function StoryWordsPanel({
  colors,
  isLocked,
  isShuffling,
  replacingWordId,
  styles,
  words,
  onPickWord,
  onReplaceWord,
  onShuffleWords,
}: StoryWordsPanelProps): ReactElement {
  const reduceMotion: boolean = useReducedMotionPreference();
  const {
    animateCardChanges,
    displayedWords,
    gridOpacity,
    isGridTransitioning,
  } = useStoryWordsGridTransition(words, reduceMotion);
  // shuffleAllProgress rotates only the global glyph while its full-set write is pending.
  const [shuffleAllProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );

  useEffect((): (() => void) | undefined => {
    shuffleAllProgress.stopAnimation();

    if (!isShuffling || reduceMotion) {
      shuffleAllProgress.setValue(0);

      return undefined;
    }

    shuffleAllProgress.setValue(0);
    // shuffleAllAnimation keeps pending feedback in the control instead of the card grid.
    const shuffleAllAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.timing(shuffleAllProgress, {
        duration: shuffleAllRotationDurationMs,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    shuffleAllAnimation.start();

    return (): void => shuffleAllAnimation.stop();
  }, [isShuffling, reduceMotion, shuffleAllProgress]);

  // shuffleButtonStyle keeps the global reroll quieter than per-word picking.
  const shuffleButtonStyle: ViewStyle = {
    backgroundColor: colors.bubbleSurfaceMuted,
    borderColor: colors.pillBorder,
  };
  // shuffleButtonTextStyle uses the brand color without another filled CTA.
  const shuffleButtonTextStyle: TextStyle = {
    color: colors.systemBlue,
  };
  // isInteractionDisabled prevents overlapping local persistence operations.
  const isInteractionDisabled: boolean =
    isLocked ||
    isShuffling ||
    isGridTransitioning ||
    replacingWordId !== undefined;
  // shuffleAllRotation explains the pending full-set action without dimming the button.
  const shuffleAllRotation: Animated.AnimatedInterpolation<string> =
    shuffleAllProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

  return (
    <View style={styles.settingsCard}>
      <View style={panelStyles.header}>
        <View style={panelStyles.titleRow}>
          <Text style={styles.actionTitle}>Story Words</Text>
          <Text style={styles.settingValue}>
            {getSelectedStoryWordsLabel(words.length)}
          </Text>
        </View>
        <View style={panelStyles.hintRow}>
          <Text style={[styles.secondaryText, panelStyles.hintText]}>
            Tap a word to choose it from Dictionary.
          </Text>
          <JellyPressable
            accessibilityLabel="Shuffle all Story Words"
            disabled={isInteractionDisabled}
            hitSlop={{ bottom: 4, top: 4 }}
            onPress={onShuffleWords}
            style={({ pressed }) => [
              panelStyles.shuffleButton,
              shuffleButtonStyle,
              pressed && styles.pressed,
            ]}
          >
            <Animated.View
              style={{ transform: [{ rotate: shuffleAllRotation }] }}
            >
              <RandomizeIcon color={colors.systemBlue} />
            </Animated.View>
            <Text style={[panelStyles.shuffleButtonText, shuffleButtonTextStyle]}>
              Shuffle all
            </Text>
          </JellyPressable>
        </View>
      </View>

      <Animated.View style={[panelStyles.wordGrid, { opacity: gridOpacity }]}>
        {/* Slot keys intentionally stay stable while a replacement changes its word id. */}
        {displayedWords.map((word, index) => (
          <StoryWordCard
            key={`story-word-slot-${index}`}
            animateWordChanges={animateCardChanges}
            colors={colors}
            isDisabled={isInteractionDisabled}
            isReplacing={word.id === replacingWordId}
            stackOrder={displayedWords.length - index}
            styles={styles}
            word={word}
            onPickWord={onPickWord}
            onReplaceWord={onReplaceWord}
          />
        ))}
      </Animated.View>
    </View>
  );
}
