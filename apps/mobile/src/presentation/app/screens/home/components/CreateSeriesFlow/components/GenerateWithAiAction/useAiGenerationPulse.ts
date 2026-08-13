import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotionPreference } from '../../../../../../shared';

// useAiGenerationPulse returns three values that form one restrained Sorbet wave.
export function useAiGenerationPulse(
  isGenerating: boolean,
): readonly Animated.Value[] {
  // reduceMotion freezes decorative pulses while keeping progress visible.
  const reduceMotion: boolean = useReducedMotionPreference();
  // dotPulses drive one short staggered wave across the three candy dots.
  const [dotPulses] = useState<readonly Animated.Value[]>(
    (): readonly Animated.Value[] => [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ],
  );

  useEffect((): (() => void) => {
    dotPulses.forEach((pulse: Animated.Value): void => pulse.setValue(0));

    if (!isGenerating || reduceMotion) {
      return (): void => undefined;
    }

    // dotAnimations form a sequential wave instead of a generic spinner.
    const dotAnimations: Animated.CompositeAnimation[] = dotPulses.map(
      (pulse: Animated.Value): Animated.CompositeAnimation =>
        Animated.sequence([
          Animated.timing(pulse, {
            duration: 260,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            duration: 360,
            easing: Easing.inOut(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
    );
    // loadingAnimation repeats with a calm pause between each complete wave.
    const loadingAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.stagger(130, dotAnimations),
        Animated.delay(320),
      ]),
    );

    loadingAnimation.start();

    return (): void => loadingAnimation.stop();
  }, [dotPulses, isGenerating, reduceMotion]);

  return dotPulses;
}
