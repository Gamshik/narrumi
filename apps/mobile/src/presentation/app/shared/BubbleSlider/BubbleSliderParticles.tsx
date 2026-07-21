import type { ReactElement } from 'react';
import { Animated } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { bubbleSliderStyles as styles } from './BubbleSlider.styles';

// BubbleSliderParticlesProps defines the iOS-only decorative feedback around the active thumb.
type BubbleSliderParticlesProps = {
  // colors supplies the three Sorbet particle accents.
  readonly colors: AppColors;
  // fillWidth anchors every particle to the current slider progress.
  readonly fillWidth: Animated.AnimatedInterpolation<string | number>;
  // particleBurst advances one rise-and-dissolve response after a snapped step.
  readonly particleBurst: Animated.Value;
  // particleDirection mirrors horizontal scatter when the learner drags left.
  readonly particleDirection: Animated.Value;
};

// BubbleSliderParticles renders decorative motion only on platforms where JS drag animation stays smooth.
export function BubbleSliderParticles({
  colors,
  fillWidth,
  particleBurst,
  particleDirection,
}: BubbleSliderParticlesProps): ReactElement {
  // directedParticleProgress mirrors the horizontal scatter for leftward movement.
  const directedParticleProgress: Animated.AnimatedMultiplication<number> =
    Animated.multiply(particleBurst, particleDirection);
  const particleAOpacity: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.22, 0.75, 1],
      outputRange: [0.9, 0.82, 0.28, 0],
    });
  const particleBOpacity: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.32, 0.78, 1],
      outputRange: [0.78, 0.7, 0.22, 0],
    });
  const particleCOpacity: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.38, 0.82, 1],
      outputRange: [0.68, 0.62, 0.18, 0],
    });
  const particleARise: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -18],
    });
  const particleBRise: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -11],
    });
  const particleCRise: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -21],
    });
  const particleADrift: Animated.AnimatedMultiplication<number> =
    Animated.multiply(directedParticleProgress, -9);
  const particleBDrift: Animated.AnimatedMultiplication<number> =
    Animated.multiply(directedParticleProgress, 10);
  const particleCDrift: Animated.AnimatedMultiplication<number> =
    Animated.multiply(directedParticleProgress, -3);
  const particleAScale: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.22, 1],
      outputRange: [0.76, 1, 0.72],
    });
  const particleBScale: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.32, 1],
      outputRange: [0.7, 1, 0.68],
    });
  const particleCScale: Animated.AnimatedInterpolation<number> =
    particleBurst.interpolate({
      inputRange: [0, 0.38, 1],
      outputRange: [0.64, 1, 0.62],
    });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.particle,
          styles.particleLarge,
          {
            backgroundColor: colors.systemPurple,
            left: fillWidth,
            opacity: particleAOpacity,
            transform: [
              { translateX: -10 },
              { translateX: particleADrift },
              { translateY: particleARise },
              { scale: particleAScale },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.particle,
          styles.particleMedium,
          {
            backgroundColor: colors.systemTeal,
            left: fillWidth,
            opacity: particleBOpacity,
            transform: [
              { translateX: 6 },
              { translateX: particleBDrift },
              { translateY: particleBRise },
              { scale: particleBScale },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.particle,
          styles.particleSmall,
          {
            backgroundColor: colors.systemBlue,
            left: fillWidth,
            opacity: particleCOpacity,
            transform: [
              { translateX: -2 },
              { translateX: particleCDrift },
              { translateY: particleCRise },
              { scale: particleCScale },
            ],
          },
        ]}
      />
    </>
  );
}
