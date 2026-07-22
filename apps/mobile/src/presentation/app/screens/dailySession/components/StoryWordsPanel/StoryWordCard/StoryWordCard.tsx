import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import type { VocabularyItem } from '@domain/index';
import {
  JellyPressable,
  useReducedMotionPreference,
} from '@presentation/app/shared';
import type { AppStyles } from '@presentation/app/types';
import { getPreferredPhonetics } from '@presentation/app/vocabulary';
import type { AppColors } from '@presentation/theme';

import { RandomizeIcon } from '../RandomizeIcon';
import { storyWordCardStyles as localStyles } from './StoryWordCard.styles';

// wordExitDurationMs keeps old copy readable while making the replacement intentional.
const wordExitDurationMs: number = 110;
// replacementLoopDurationMs gives the local shuffle signal a calm continuous cadence.
const replacementLoopDurationMs: number = 620;

// StoryWordCardProps defines one stable Story Words slot and its local interaction state.
export type StoryWordCardProps = {
  // animateWordChanges keeps the local spring only for a single changed slot.
  readonly animateWordChanges: boolean;
  // colors provides semantic Sorbet materials for this card.
  readonly colors: AppColors;
  // isDisabled blocks overlapping mutations without visually dimming unrelated cards.
  readonly isDisabled: boolean;
  // isReplacing scopes progress motion to the one card selected by the learner.
  readonly isReplacing: boolean;
  // stackOrder keeps earlier wrapped rows above later siblings.
  readonly stackOrder: number;
  // styles provides the current screen typography and shared control states.
  readonly styles: AppStyles;
  // word is the latest vocabulary item assigned to this stable visual slot.
  readonly word: VocabularyItem;
  // onPickWord opens the Dictionary picker for the current slot.
  readonly onPickWord: (wordId: string) => void;
  // onReplaceWord requests one random replacement for the current slot.
  readonly onReplaceWord: (wordId: string) => void;
};

// StoryWordCard keeps replacement feedback local and transitions only changed copy.
export function StoryWordCard({
  animateWordChanges,
  colors,
  isDisabled,
  isReplacing,
  onPickWord,
  onReplaceWord,
  stackOrder,
  styles,
  word,
}: StoryWordCardProps): ReactElement {
  const reduceMotion: boolean = useReducedMotionPreference();
  // displayedWord preserves the old copy until its exit motion has completed.
  const [displayedWord, setDisplayedWord] = useState<VocabularyItem>(word);
  // displayedWordIdRef distinguishes a real slot replacement from parent rerenders.
  const displayedWordIdRef: RefObject<string> = useRef<string>(word.id);
  // wordTransition drives the old-copy exit and new-copy arrival in the same slot.
  const [wordTransition] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // replacementProgress drives the local glow and shuffle-icon rotation while saving.
  const [replacementProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // wordTransitionAnimationRef cancels an outdated transition after a rapid update.
  const wordTransitionAnimationRef: RefObject<
    Animated.CompositeAnimation | undefined
  > = useRef<Animated.CompositeAnimation | undefined>(undefined);

  useEffect((): (() => void) | undefined => {
    wordTransitionAnimationRef.current?.stop();

    if (displayedWordIdRef.current === word.id) {
      wordTransition.setValue(1);

      return undefined;
    }

    if (reduceMotion || !animateWordChanges) {
      displayedWordIdRef.current = word.id;
      setDisplayedWord(word);
      wordTransition.setValue(1);

      return undefined;
    }

    // exitAnimation clears only the old card copy before the new word settles in.
    const exitAnimation: Animated.CompositeAnimation = Animated.timing(
      wordTransition,
      {
        duration: wordExitDurationMs,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      },
    );
    wordTransitionAnimationRef.current = exitAnimation;
    exitAnimation.start(({ finished }: { finished: boolean }): void => {
      if (!finished) {
        return;
      }

      displayedWordIdRef.current = word.id;
      setDisplayedWord(word);
      wordTransition.setValue(0);

      // enterAnimation gives the new word a restrained soft-pop arrival.
      const enterAnimation: Animated.CompositeAnimation = Animated.spring(
        wordTransition,
        {
          bounciness: 5,
          speed: 22,
          toValue: 1,
          useNativeDriver: true,
        },
      );
      wordTransitionAnimationRef.current = enterAnimation;
      enterAnimation.start();
    });

    return (): void => wordTransitionAnimationRef.current?.stop();
  }, [
    animateWordChanges,
    reduceMotion,
    word,
    wordTransition,
    wordTransitionAnimationRef,
  ]);

  useEffect((): (() => void) | undefined => {
    replacementProgress.stopAnimation();

    if (!isReplacing || reduceMotion) {
      replacementProgress.setValue(0);

      return undefined;
    }

    replacementProgress.setValue(0);
    // replacementAnimation stays entirely inside the selected card while local data saves.
    const replacementAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.timing(replacementProgress, {
        duration: replacementLoopDurationMs,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    replacementAnimation.start();

    return (): void => replacementAnimation.stop();
  }, [isReplacing, reduceMotion, replacementProgress]);

  // wordBubbleStyle applies theme tokens and the slot stacking order without duplication.
  const wordBubbleStyle: ViewStyle = {
    borderColor: colors.bubbleBorder,
    zIndex: stackOrder,
  };
  // randomButtonStyle gives the corner action one semantic accent in both themes.
  const randomButtonStyle: ViewStyle = {
    backgroundColor: colors.systemPink,
    borderColor: colors.bubbleBorder,
    shadowColor: colors.systemPink,
  };
  // wordCopyStyle fades and settles only the changing text instead of the entire grid.
  const wordCopyStyle: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: wordTransition,
    transform: [
      {
        translateY: wordTransition.interpolate({
          extrapolate: 'clamp',
          inputRange: [0, 1],
          outputRange: [5, 0],
        }),
      },
      {
        scale: wordTransition.interpolate({
          extrapolate: 'clamp',
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };
  // replacementGlowOpacity breathes quietly without turning the card into a loader.
  const replacementGlowOpacity: Animated.AnimatedInterpolation<number> =
    replacementProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.3, 0],
    });
  // replacementIconRotation makes the pressed shuffle affordance explain the local change.
  const replacementIconRotation: Animated.AnimatedInterpolation<string> =
    replacementProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  // wordTitleStyle preserves the shared screen color while keeping local typography compact.
  const wordTitleStyle: TextStyle = localStyles.wordTitle;
  // phoneticsStyle makes pronunciation the card's primary learning cue after the word.
  const phoneticsStyle: TextStyle = {
    color: colors.systemOrange,
  };
  // translationStyle keeps the requested meaning visible without competing with the headword.
  const translationStyle: TextStyle = {
    color: colors.systemBlue,
  };
  // partOfSpeechStyle keeps grammar metadata readable without competing with pronunciation.
  const partOfSpeechStyle: TextStyle = {
    color: colors.labelTertiary,
  };

  return (
    <View style={[localStyles.wordBubble, wordBubbleStyle]}>
      <JellyPressable
        accessibilityHint="Opens the local dictionary for this slot"
        accessibilityLabel={`Change ${displayedWord.word}, ${displayedWord.translation}`}
        disabled={isDisabled}
        onPress={() => onPickWord(displayedWord.id)}
        style={({ pressed }) => [
          localStyles.wordButton,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={[colors.bubbleSurfaceRaised, colors.bubbleSurface]}
          end={{ x: 0.82, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.12, y: 0 }}
          style={localStyles.wordGradient}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            localStyles.replacementGlow,
            { opacity: replacementGlowOpacity },
          ]}
        >
          <LinearGradient
            colors={[
              `${colors.systemPink}00`,
              `${colors.systemPink}38`,
              `${colors.systemTeal}20`,
              `${colors.systemPink}00`,
            ]}
            end={{ x: 1, y: 1 }}
            locations={[0, 0.32, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            style={localStyles.replacementGlowGradient}
          />
        </Animated.View>
        <Animated.View style={[localStyles.wordCopy, wordCopyStyle]}>
          <Text
            numberOfLines={1}
            style={[styles.wordTitle, wordTitleStyle]}
          >
            {displayedWord.word}
          </Text>
          <Text numberOfLines={1} style={[localStyles.translation, translationStyle]}>
            {displayedWord.translation}
          </Text>
          <View style={localStyles.wordMeta}>
            <Text
              numberOfLines={1}
              style={[localStyles.phonetics, phoneticsStyle]}
            >
              {getPreferredPhonetics(displayedWord)}
            </Text>
            <Text
              numberOfLines={1}
              style={[localStyles.partOfSpeech, partOfSpeechStyle]}
            >
              {displayedWord.partOfSpeech}
            </Text>
          </View>
        </Animated.View>
      </JellyPressable>
      <JellyPressable
        accessibilityLabel={`Replace ${displayedWord.word} randomly`}
        containerStyle={localStyles.randomButtonSlot}
        disabled={isDisabled}
        hitSlop={5}
        onPress={() => onReplaceWord(displayedWord.id)}
        style={({ pressed }) => [
          localStyles.randomButton,
          randomButtonStyle,
          pressed && styles.pressed,
        ]}
      >
        <Animated.View
          style={{ transform: [{ rotate: replacementIconRotation }] }}
        >
          <RandomizeIcon color="#ffffff" />
        </Animated.View>
      </JellyPressable>
    </View>
  );
}
