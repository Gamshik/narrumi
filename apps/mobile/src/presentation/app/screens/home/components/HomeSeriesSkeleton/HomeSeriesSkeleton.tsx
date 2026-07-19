import { useEffect, useState, type ReactElement } from 'react';
import { Animated, Easing, View } from 'react-native';

import {
  BubbleSurface,
  useReducedMotionPreference,
} from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { styles } from './HomeSeriesSkeleton.styles';

// HomeSeriesSkeletonProps carries the active semantic palette into loading placeholders.
export type HomeSeriesSkeletonProps = {
  // colors keeps skeleton surfaces and fills correct in both supported themes.
  readonly colors: AppColors;
};

// skeletonRows keeps the initial Home height stable while local series are being resolved.
const skeletonRows: readonly string[] = [
  'first-series-placeholder',
  'second-series-placeholder',
  'third-series-placeholder',
];

// HomeSeriesSkeleton mirrors the populated Home hierarchy without exposing a premature action.
export function HomeSeriesSkeleton({
  colors,
}: HomeSeriesSkeletonProps): ReactElement {
  // reduceMotion freezes decorative loading motion for users who request it.
  const reduceMotion: boolean = useReducedMotionPreference();
  // pulseProgress drives one restrained shared rhythm across the related placeholders.
  const [pulseProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );

  useEffect((): (() => void) => {
    if (reduceMotion) {
      pulseProgress.stopAnimation();
      pulseProgress.setValue(1);
      return (): void => undefined;
    }

    // pulseAnimation keeps the loading state alive without competing with the Home content.
    const pulseAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return (): void => {
      pulseAnimation.stop();
    };
  }, [pulseProgress, reduceMotion]);

  // placeholderOpacity preserves legibility while gently changing skeleton emphasis.
  const placeholderOpacity: Animated.AnimatedInterpolation<number> =
    pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.46, 0.94],
    });
  // trailingOpacity offsets secondary shapes so the skeleton reads as a traveling wave.
  const trailingOpacity: Animated.AnimatedInterpolation<number> =
    pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 0.5],
    });
  // leadingDrift gives primary lines a barely perceptible directional shimmer.
  const leadingDrift: Animated.AnimatedInterpolation<number> =
    pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [-2, 2],
    });
  // trailingDrift moves supporting shapes against the leading edge of the wave.
  const trailingDrift: Animated.AnimatedInterpolation<number> =
    pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [2, -2],
    });
  // actionScale makes the circular call-to-action placeholder feel softly inflated.
  const actionScale: Animated.AnimatedInterpolation<number> =
    pulseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.97, 1.02],
    });
  // seriesPlaceholders materializes stable keyed rows without adding accessible duplicate content.
  const seriesPlaceholders: ReactElement[] = [];

  for (const rowKey of skeletonRows) {
    seriesPlaceholders.push(
      <BubbleSurface colors={colors} key={rowKey} style={styles.card}>
        <Animated.View
          style={[
            styles.cardTitle,
            { backgroundColor: colors.backgroundTertiary },
            {
              opacity: placeholderOpacity,
              transform: [{ translateX: leadingDrift }],
            },
          ]}
        />
        <View style={styles.cardFooter}>
          <Animated.View
            style={[
              styles.cardMeta,
              { backgroundColor: colors.backgroundTertiary },
              {
                opacity: trailingOpacity,
                transform: [{ translateX: trailingDrift }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.cardProgress,
              { backgroundColor: colors.separator },
              {
                opacity: placeholderOpacity,
                transform: [{ translateX: leadingDrift }],
              },
            ]}
          />
        </View>
      </BubbleSurface>,
    );
  }

  return (
    <View
      accessibilityLabel="Loading saved series"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.root}
    >
      <BubbleSurface colors={colors} style={styles.action} variant="list">
        <View style={styles.copy}>
          <Animated.View
            style={[
              styles.title,
              { backgroundColor: colors.backgroundTertiary },
              {
                opacity: placeholderOpacity,
                transform: [{ translateX: leadingDrift }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.subtitle,
              { backgroundColor: colors.separator },
              {
                opacity: trailingOpacity,
                transform: [{ translateX: trailingDrift }],
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundTertiary },
            {
              opacity: placeholderOpacity,
              transform: [{ scale: actionScale }],
            },
          ]}
        />
      </BubbleSurface>

      <View importantForAccessibility="no-hide-descendants" style={styles.list}>
        {seriesPlaceholders}
      </View>
    </View>
  );
}
