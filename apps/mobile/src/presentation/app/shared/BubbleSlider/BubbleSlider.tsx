import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  type PanResponderGestureState,
  type PanResponderInstance,
  Text,
  View,
} from 'react-native';

import { motion } from '@presentation/theme';

import { useReducedMotionPreference } from '../SorbetTabBar';
import {
  getSliderPercentage,
  getSliderValueFromPosition,
  getSteppedSliderValue,
} from './BubbleSlider.helpers';
import { bubbleSliderStyles as styles } from './BubbleSlider.styles';
import type { BubbleSliderProps } from './BubbleSlider.types';

// sliderTrackInset matches the horizontal margin that keeps the thumb inside its surface.
const sliderTrackInset: number = 12;

// BubbleSlider renders a tactile, accessible Sorbet slider without owning persistence.
export function BubbleSlider({
  accessibilityLabel,
  colors,
  max,
  maximumLabel,
  min,
  minimumLabel,
  step = 1,
  value,
  valueUnit = '',
  onValueChange,
  onSlidingComplete,
  onInteractionStart,
  onInteractionEnd,
}: BubbleSliderProps): ReactElement {
  const reduceMotion: boolean = useReducedMotionPreference();
  const trackWidthRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);
  const currentValueRef = useRef<number>(value);
  const startValueRef = useRef<number>(value);
  const [localValue, setLocalValue] = useState<number>(value);
  const [progress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(getSliderPercentage(value, min, max)),
  );
  const [thumbScale] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  const [particleBurst] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  const [particleDirection] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  const [panResponder, setPanResponder] =
    useState<PanResponderInstance | null>(null);

  // emitMicroBubbles marks a snapped change with a brief directional particle response.
  const emitMicroBubbles = useCallback(
    (direction: number): void => {
      if (reduceMotion || direction === 0) {
        return;
      }

      particleBurst.stopAnimation();
      particleDirection.setValue(direction);
      particleBurst.setValue(0);
      Animated.timing(particleBurst, {
        duration: 320,
        toValue: 1,
        useNativeDriver: false,
      }).start();
    },
    [particleBurst, particleDirection, reduceMotion],
  );

  // applyValue keeps visual progress, transient state, and callbacks on the same snapped value.
  const applyValue = useCallback(
    (candidate: number): number => {
      const nextValue: number = getSteppedSliderValue(
        candidate,
        min,
        max,
        step,
      );

      if (currentValueRef.current !== nextValue) {
        const movementDirection: number = Math.sign(
          nextValue - currentValueRef.current,
        );

        if (isInteractingRef.current) {
          emitMicroBubbles(movementDirection);
        }

        currentValueRef.current = nextValue;
        setLocalValue(nextValue);
        progress.setValue(getSliderPercentage(nextValue, min, max));
        onValueChange?.(nextValue);
      }

      return nextValue;
    },
    [emitMicroBubbles, max, min, onValueChange, progress, step],
  );

  // setInteractionState gives drag start and release one consistent elastic response.
  const setInteractionState = useCallback(
    (isActive: boolean): void => {
      const targetScale: number = isActive ? 1.08 : 1;

      if (reduceMotion) {
        thumbScale.setValue(targetScale);
        return;
      }

      Animated.spring(thumbScale, {
        bounciness: isActive
          ? motion.springBounciness
          : motion.releaseSpringBounciness,
        speed: isActive ? motion.springSpeed : motion.releaseSpringSpeed,
        toValue: targetScale,
        // The thumb also receives JS-driven `left`; one Animated view cannot mix drivers.
        useNativeDriver: false,
      }).start();
    },
    [reduceMotion, thumbScale],
  );

  useEffect((): void => {
    if (isInteractingRef.current) {
      return;
    }

    const nextValue: number = getSteppedSliderValue(value, min, max, step);
    const nextProgress: number = getSliderPercentage(nextValue, min, max);
    currentValueRef.current = nextValue;
    setLocalValue(nextValue);

    if (reduceMotion) {
      progress.setValue(nextProgress);
      return;
    }

    Animated.spring(progress, {
      bounciness: 2,
      speed: 26,
      toValue: nextProgress,
      useNativeDriver: false,
    }).start();
  }, [max, min, progress, reduceMotion, step, value]);

  // finishInteraction restores parent scrolling and persists the final snapped value once.
  const finishInteraction = useCallback((): void => {
    isInteractingRef.current = false;
    setInteractionState(false);
    onInteractionEnd?.();
    onSlidingComplete?.(currentValueRef.current);
  }, [onInteractionEnd, onSlidingComplete, setInteractionState]);

  useEffect((): void => {
    // responder converts taps and horizontal dragging into bounded discrete values after render.
    const responder: PanResponderInstance = PanResponder.create({
      onMoveShouldSetPanResponder: (): boolean => true,
      onMoveShouldSetPanResponderCapture: (): boolean => true,
      onPanResponderGrant: (event: GestureResponderEvent): void => {
        isInteractingRef.current = true;
        onInteractionStart?.();
        setInteractionState(true);
        applyValue(
          getSliderValueFromPosition(
            event.nativeEvent.locationX - sliderTrackInset,
            trackWidthRef.current,
            min,
            max,
            step,
          ),
        );
        startValueRef.current = currentValueRef.current;
      },
      onPanResponderMove: (
        _event: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ): void => {
        const trackWidth: number = trackWidthRef.current;

        if (trackWidth <= 0) {
          return;
        }

        applyValue(
          startValueRef.current +
            (gestureState.dx / trackWidth) * (max - min),
        );
      },
      onPanResponderRelease: finishInteraction,
      onPanResponderTerminate: finishInteraction,
      onPanResponderTerminationRequest: (): boolean => false,
      onStartShouldSetPanResponder: (): boolean => true,
      onStartShouldSetPanResponderCapture: (): boolean => true,
    });

    setPanResponder(responder);
  }, [
    applyValue,
    finishInteraction,
    max,
    min,
    onInteractionStart,
    setInteractionState,
    step,
  ]);

  // handleAccessibilityAction makes hardware and screen-reader adjustments persist immediately.
  const handleAccessibilityAction = (
    event: AccessibilityActionEvent,
  ): void => {
    const actionName: string = event.nativeEvent.actionName;

    if (actionName !== 'increment' && actionName !== 'decrement') {
      return;
    }

    const direction: number = actionName === 'increment' ? 1 : -1;
    const nextValue: number = applyValue(
      currentValueRef.current + direction * step,
    );
    onSlidingComplete?.(nextValue);
  };

  // handleTrackLayout retains only the usable distance between the thumb endpoints.
  const handleTrackLayout = (event: LayoutChangeEvent): void => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  };

  // fillWidth drives both the colored track and compact thumb from one progress value.
  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
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
  const accessibilityText: string = `${localValue}${
    valueUnit ? ` ${valueUnit}` : ''
  }`;
  const hasEndpointLabels: boolean = Boolean(minimumLabel || maximumLabel);

  return (
    <View
      accessibilityActions={[
        { name: 'increment', label: 'Increase value' },
        { name: 'decrement', label: 'Decrease value' },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        max,
        min,
        now: localValue,
        text: accessibilityText,
      }}
      accessible
      onAccessibilityAction={handleAccessibilityAction}
      style={styles.container}
      {...panResponder?.panHandlers}
    >
      <View onLayout={handleTrackLayout} style={styles.gestureArea}>
        <View
          pointerEvents="none"
          style={[
            styles.trackShell,
            {
              backgroundColor: colors.separator,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: colors.systemBlue, width: fillWidth },
            ]}
          />
        </View>
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
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor: colors.bubbleSurfaceRaised,
              borderColor: colors.systemBlue,
              left: fillWidth,
              shadowColor: colors.labelPrimary,
              transform: [{ translateX: -12 }, { scale: thumbScale }],
            },
          ]}
        />
      </View>

      {hasEndpointLabels ? (
        <View pointerEvents="none" style={styles.labels}>
          <Text style={[styles.endpointLabel, { color: colors.labelSecondary }]}>
            {minimumLabel}
          </Text>
          <Text style={[styles.endpointLabel, { color: colors.labelSecondary }]}>
            {maximumLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
