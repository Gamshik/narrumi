import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// pickerContentEnterDelayMs lets the Sorbet surface arrive just before its controls.
const pickerContentEnterDelayMs: number = 55;
// pickerContentEnterDurationMs keeps labels and results readable without a long reveal.
const pickerContentEnterDurationMs: number = 180;
// pickerContentExitDurationMs clears interactive content before the surface recedes.
const pickerContentExitDurationMs: number = 90;
// pickerSurfaceExitDurationMs makes closing faster than opening while preserving material weight.
const pickerSurfaceExitDurationMs: number = 170;

// DictionaryPickerTransition exposes the native-driven styles and coordinated close action.
export type DictionaryPickerTransition = {
  // closePicker plays the exit motion before releasing the mounted picker.
  readonly closePicker: () => void;
  // contentOpacity reveals controls after the surrounding material appears.
  readonly contentOpacity: Animated.AnimatedInterpolation<number>;
  // contentTranslateY gives inner controls a small independent lift.
  readonly contentTranslateY: Animated.AnimatedInterpolation<number>;
  // isClosing blocks interaction during the short mounted exit tail.
  readonly isClosing: boolean;
  // surfaceOpacity keeps the panel from flashing during its opening scale.
  readonly surfaceOpacity: Animated.AnimatedInterpolation<number>;
  // surfaceScale inflates the picker from the shared sheet-enter scale.
  readonly surfaceScale: Animated.AnimatedInterpolation<number>;
  // surfaceTranslateY lifts the picker into its settled layout position.
  readonly surfaceTranslateY: Animated.AnimatedInterpolation<number>;
};

// useDictionaryPickerTransition coordinates a staged Sorbet entrance and a complete exit.
export function useDictionaryPickerTransition(
  reduceMotion: boolean,
  onClosed: () => void,
): DictionaryPickerTransition {
  // surfaceProgress owns the mounted panel's opacity, scale, and vertical travel.
  const [surfaceProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // contentProgress lets controls follow the material instead of appearing simultaneously.
  const [contentProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // isClosing blocks interaction while the mounted panel completes its exit.
  const [isClosing, setIsClosing] = useState<boolean>(false);
  // isClosingRef synchronously prevents repeated taps before React renders the disabled state.
  const isClosingRef = useRef<boolean>(false);
  // onClosedRef keeps the transition stable when the parent callback identity changes.
  const onClosedRef = useRef<() => void>(onClosed);

  useEffect((): void => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect((): (() => void) => {
    surfaceProgress.stopAnimation();
    contentProgress.stopAnimation();
    isClosingRef.current = false;
    setIsClosing(false);

    if (reduceMotion) {
      surfaceProgress.setValue(1);
      contentProgress.setValue(1);

      return (): void => undefined;
    }

    surfaceProgress.setValue(0);
    contentProgress.setValue(0);

    // entranceAnimation gives the panel one weighted material motion and one delayed content beat.
    const entranceAnimation: Animated.CompositeAnimation = Animated.parallel([
      Animated.spring(surfaceProgress, {
        bounciness: 4,
        speed: 22,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(contentProgress, {
        delay: pickerContentEnterDelayMs,
        duration: pickerContentEnterDurationMs,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    entranceAnimation.start();

    return (): void => entranceAnimation.stop();
  }, [contentProgress, reduceMotion, surfaceProgress]);

  // closePicker preserves the component until both exit layers have visually settled.
  const closePicker = useCallback((): void => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    setIsClosing(true);
    surfaceProgress.stopAnimation();
    contentProgress.stopAnimation();

    if (reduceMotion) {
      surfaceProgress.setValue(0);
      contentProgress.setValue(0);
      onClosedRef.current();

      return;
    }

    // exitAnimation removes content first while the Sorbet surface retains a brief material tail.
    const exitAnimation: Animated.CompositeAnimation = Animated.parallel([
      Animated.timing(contentProgress, {
        duration: pickerContentExitDurationMs,
        easing: Easing.in(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(surfaceProgress, {
        duration: pickerSurfaceExitDurationMs,
        easing: Easing.inOut(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);

    exitAnimation.start(({ finished }: { finished: boolean }): void => {
      if (finished) {
        onClosedRef.current();

        return;
      }

      isClosingRef.current = false;
      setIsClosing(false);
    });
  }, [contentProgress, reduceMotion, surfaceProgress]);

  // surfaceOpacity lets the surface become readable before the delayed content layer.
  const surfaceOpacity: Animated.AnimatedInterpolation<number> =
    surfaceProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 0.34, 1],
      outputRange: [0, 0.7, 1],
    });
  // surfaceScale uses the design system's canonical sheet entry compression.
  const surfaceScale: Animated.AnimatedInterpolation<number> =
    surfaceProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.96, 1],
    });
  // surfaceTranslateY keeps the transition directional without moving surrounding layout.
  const surfaceTranslateY: Animated.AnimatedInterpolation<number> =
    surfaceProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [14, 0],
    });
  // contentOpacity follows its delayed timeline instead of sharing the surface fade.
  const contentOpacity: Animated.AnimatedInterpolation<number> =
    contentProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
  // contentTranslateY gives the controls a smaller lift nested inside the panel motion.
  const contentTranslateY: Animated.AnimatedInterpolation<number> =
    contentProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [6, 0],
    });

  return {
    closePicker,
    contentOpacity,
    contentTranslateY,
    isClosing,
    surfaceOpacity,
    surfaceScale,
    surfaceTranslateY,
  };
}
