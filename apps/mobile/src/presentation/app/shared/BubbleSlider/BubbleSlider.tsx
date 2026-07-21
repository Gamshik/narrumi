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
  Platform,
  Text,
  View,
} from 'react-native';

import { motion } from '@presentation/theme';

import { useReducedMotionPreference } from '../SorbetTabBar';
import {
  getSliderPercentage,
  getSliderTouchPosition,
  getSliderValueFromPosition,
  getSteppedSliderValue,
} from './BubbleSlider.helpers';
import { BubbleSliderParticles } from './BubbleSliderParticles';
import { bubbleSliderStyles as styles } from './BubbleSlider.styles';
import type { BubbleSliderProps } from './BubbleSlider.types';

// sliderTrackInset matches the horizontal margin that keeps the thumb inside its surface.
const sliderTrackInset: number = 12;
// supportsSliderParticles avoids restarting JS-driven decorative motion during Android drag events.
const supportsSliderParticles: boolean = Platform.OS !== 'android';

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
  // gestureAreaRef measures the track in window coordinates for stable Android pageX mapping.
  const gestureAreaRef = useRef<View>(null);
  const trackWidthRef = useRef<number>(0);
  const trackPageXRef = useRef<number | undefined>(undefined);
  const isInteractingRef = useRef<boolean>(false);
  const currentValueRef = useRef<number>(value);
  const startPositionRef = useRef<number>(0);
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
  // panResponder is installed after render so responder callbacks may safely read live refs.
  const [panResponder, setPanResponder] =
    useState<PanResponderInstance | null>(null);

  // emitMicroBubbles marks a snapped change with a brief directional particle response.
  const emitMicroBubbles = useCallback(
    (direction: number): void => {
      if (!supportsSliderParticles || reduceMotion || direction === 0) {
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
    if (!isInteractingRef.current) {
      return;
    }

    isInteractingRef.current = false;
    setInteractionState(false);
    onInteractionEnd?.();
    onSlidingComplete?.(currentValueRef.current);
  }, [onInteractionEnd, onSlidingComplete, setInteractionState]);

  useEffect((): void => {
    // responder converts absolute touches into bounded values while reading measurements only during gestures.
    const responder: PanResponderInstance = PanResponder.create({
      onMoveShouldSetPanResponder: (): boolean => true,
      onMoveShouldSetPanResponderCapture: (): boolean => true,
      onPanResponderGrant: (event: GestureResponderEvent): void => {
        isInteractingRef.current = true;
        onInteractionStart?.();
        setInteractionState(true);
        const touchPosition: number = getSliderTouchPosition(
          event.nativeEvent.pageX,
          trackPageXRef.current,
          event.nativeEvent.locationX,
          sliderTrackInset,
        );

        startPositionRef.current = touchPosition;
        applyValue(
          getSliderValueFromPosition(
            touchPosition,
            trackWidthRef.current,
            min,
            max,
            step,
          ),
        );
      },
      onPanResponderMove: (
        _event: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ): void => {
        const trackWidth: number = trackWidthRef.current;

        if (trackWidth <= 0) {
          return;
        }

        const touchPosition: number =
          trackPageXRef.current === undefined
            ? startPositionRef.current + gestureState.dx
            : gestureState.moveX - trackPageXRef.current;

        applyValue(
          getSliderValueFromPosition(
            touchPosition,
            trackWidth,
            min,
            max,
            step,
          ),
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
    gestureAreaRef.current?.measureInWindow(
      (x: number, _y: number, width: number, _height: number): void => {
        trackPageXRef.current = x;

        if (width > 0) {
          trackWidthRef.current = width;
        }
      },
    );
  };

  // fillWidth drives both the colored track and compact thumb from one progress value.
  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
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
      <View
        onLayout={handleTrackLayout}
        ref={gestureAreaRef}
        style={styles.gestureArea}
      >
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
        {supportsSliderParticles ? (
          <BubbleSliderParticles
            colors={colors}
            fillWidth={fillWidth}
            particleBurst={particleBurst}
            particleDirection={particleDirection}
          />
        ) : null}
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
