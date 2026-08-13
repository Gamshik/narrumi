import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotionPreference } from '@presentation/app/shared';

import type { EpisodeSetupStep } from './episodeSetupSteps';

// EpisodeSetupTransition exposes the restrained card-entry motion values.
export type EpisodeSetupTransition = {
  // opacity reveals the focused task without cross-fading the whole screen.
  readonly opacity: Animated.Value;
  // scale settles the new card from a lightly compressed state.
  readonly scale: Animated.AnimatedInterpolation<number>;
  // translateY gives each task a short vertical arrival.
  readonly translateY: Animated.AnimatedInterpolation<number>;
};

// episodeSetupTransitionDuration keeps repeated preparation movement brief.
const episodeSetupTransitionDuration: number = 220;

// useEpisodeSetupTransition animates only the newly focused setup card.
export function useEpisodeSetupTransition(
  activeStep: EpisodeSetupStep,
): EpisodeSetupTransition {
  // reduceMotion converts decorative movement into an immediate state change.
  const reduceMotion: boolean = useReducedMotionPreference();
  // progress drives opacity and transforms from one synchronized native value.
  const [progress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );

  useEffect((): (() => void) => {
    progress.stopAnimation();

    if (reduceMotion) {
      progress.setValue(1);

      return (): void => undefined;
    }

    progress.setValue(0);
    // entryAnimation gives the replacement card one short coherent visual beat.
    const entryAnimation: Animated.CompositeAnimation = Animated.timing(
      progress,
      {
        duration: episodeSetupTransitionDuration,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      },
    );

    entryAnimation.start();

    return (): void => entryAnimation.stop();
  }, [activeStep, progress, reduceMotion]);

  return {
    opacity: progress,
    scale: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.975, 1],
      extrapolate: 'clamp',
    }),
    translateY: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 0],
      extrapolate: 'clamp',
    }),
  };
}
