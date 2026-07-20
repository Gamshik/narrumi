import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  BubbleSurface,
  JellyPressable,
  useReducedMotionPreference,
} from '@presentation/app/shared';
import { motion, type AppColors } from '@presentation/theme';

import { selectionActionBarStyles as styles } from './SelectionActionBar.styles';

// selectionActionEnterDurationMs gives the bubble enough time for one soft-pop beat.
const selectionActionEnterDurationMs: number = 240;
// selectionActionExitDurationMs keeps deselection responsive while making removal legible.
const selectionActionExitDurationMs: number = 160;

// SelectionActionBarProps controls the floating excerpt action surface.
type SelectionActionBarProps = {
  // bottomInset keeps the bar above the device home indicator.
  readonly bottomInset: number;
  // colors provides current semantic theme tokens.
  readonly colors: AppColors;
  // isTranslating disables duplicate requests and shows immediate progress.
  readonly isTranslating: boolean;
  // isVisible keeps the surface mounted long enough to animate genuine deselection.
  readonly isVisible: boolean;
  // onTranslate starts exact-text Russian translation for the current range.
  readonly onTranslate: () => void;
};

// SelectionActionBar presents one live action and two reserved future slots.
export function SelectionActionBar({
  bottomInset,
  colors,
  isTranslating,
  isVisible,
  onTranslate,
}: SelectionActionBarProps): ReactElement | null {
  const reduceMotion: boolean = useReducedMotionPreference();
  // visibilityProgress drives both the soft-pop entrance and the compact exit.
  const [visibilityProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // isRendered preserves the native view until its exit animation completes.
  const [isRendered, setIsRendered] = useState<boolean>(isVisible);
  // rootPosition keeps the compact panel inside the safe area.
  const rootPosition: ViewStyle = { bottom: bottomInset + 14 };
  // surfaceColor applies the active theme without duplicating BubbleSurface chrome.
  const surfaceColor: ViewStyle = {
    backgroundColor: colors.bubbleSurfaceRaised,
    borderColor: colors.bubbleBorder,
  };
  // translateColor keeps the only active action visually dominant.
  const translateColor: ViewStyle = { backgroundColor: colors.systemBlue };
  // futureActionColor marks reserved controls as intentionally inactive.
  const futureActionColor: ViewStyle = {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.pillBorder,
  };
  // futureActionTextColor keeps placeholder glyphs secondary in both themes.
  const futureActionTextColor: TextStyle = { color: colors.labelTertiary };
  // visibilityStyle combines a small lift and scale without moving reader content.
  const visibilityStyle: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: visibilityProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        translateY: visibilityProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: visibilityProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [motion.sheetEnterScale, 1],
        }),
      },
    ],
  };

  useEffect((): (() => void) | undefined => {
    if (reduceMotion) {
      visibilityProgress.stopAnimation();
      visibilityProgress.setValue(isVisible ? 1 : 0);
      setIsRendered(isVisible);
      return undefined;
    }

    if (isVisible) {
      setIsRendered(true);
    }

    const animation: Animated.CompositeAnimation = Animated.timing(
      visibilityProgress,
      {
        duration: isVisible
          ? selectionActionEnterDurationMs
          : selectionActionExitDurationMs,
        easing: isVisible
          ? Easing.out(Easing.back(1.2))
          : Easing.in(Easing.cubic),
        toValue: isVisible ? 1 : 0,
        useNativeDriver: true,
      },
    );
    animation.start(({ finished }: { finished: boolean }): void => {
      if (finished && !isVisible) {
        setIsRendered(false);
      }
    });

    return (): void => {
      animation.stop();
    };
  }, [isVisible, reduceMotion, visibilityProgress]);

  if (!isRendered) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden={!isVisible}
      importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[styles.root, rootPosition, visibilityStyle]}
    >
      <BubbleSurface
        colors={colors}
        style={[styles.surface, surfaceColor]}
        variant="card"
      >
        <JellyPressable
          accessibilityLabel="Translate selected text"
          accessibilityRole="button"
          disabled={isTranslating}
          onPress={onTranslate}
          style={[styles.translateButton, translateColor]}
        >
          {isTranslating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.translateGlyph}>A·Я</Text>
          )}
          <Text style={styles.translateLabel}>
            {isTranslating ? 'Translating' : 'Translate'}
          </Text>
        </JellyPressable>
        <FutureAction
          colors={futureActionColor}
          delayMs={120}
          reduceMotion={reduceMotion}
          textColor={futureActionTextColor}
        />
        <FutureAction
          colors={futureActionColor}
          delayMs={480}
          reduceMotion={reduceMotion}
          textColor={futureActionTextColor}
        />
      </BubbleSurface>
    </Animated.View>
  );
}

// FutureActionProps styles one inaccessible-until-later reserved control.
type FutureActionProps = {
  // colors provides the muted placeholder surface.
  readonly colors: ViewStyle;
  // delayMs offsets sibling question-mark breathing so they never pulse in lockstep.
  readonly delayMs: number;
  // reduceMotion disables decorative breathing for the accessibility preference.
  readonly reduceMotion: boolean;
  // textColor provides the low-emphasis question-mark color.
  readonly textColor: TextStyle;
};

// FutureAction renders a clear disabled placeholder for planned reader tools.
function FutureAction({
  colors,
  delayMs,
  reduceMotion,
  textColor,
}: FutureActionProps): ReactElement {
  // questionProgress drives one restrained floating breath for this placeholder.
  const [questionProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // questionMotion animates only the glyph so the disabled control remains stable.
  const questionMotion: Animated.WithAnimatedObject<TextStyle> = {
    opacity: questionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.62, 1],
    }),
    transform: [
      {
        translateY: questionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -2],
        }),
      },
      {
        scale: questionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  useEffect((): (() => void) | undefined => {
    if (reduceMotion) {
      questionProgress.setValue(0);
      return undefined;
    }

    const animation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(questionProgress, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(questionProgress, {
          duration: 380,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );

    animation.start();

    return (): void => {
      animation.stop();
    };
  }, [delayMs, questionProgress, reduceMotion]);

  return (
    <View
      accessibilityLabel="Future reader action"
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      style={[styles.futureAction, colors]}
    >
      <Animated.Text
        style={[styles.futureActionText, textColor, questionMotion]}
      >
        ?
      </Animated.Text>
    </View>
  );
}
