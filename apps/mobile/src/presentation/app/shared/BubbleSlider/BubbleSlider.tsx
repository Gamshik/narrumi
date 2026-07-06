import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type PanResponderInstance,
} from 'react-native';

// BubbleSliderProps exposes a bounded, step-based value control for local settings.
export type BubbleSliderProps = {
  // max is the inclusive upper bound for the controlled value.
  readonly max: number;
  // min is the inclusive lower bound for the controlled value.
  readonly min: number;
  // step defines the increment used when snapping drag positions to values.
  readonly step?: number;
  // value is the externally persisted setting value.
  readonly value: number;
  // onValueChange reports transient drag values before persistence.
  readonly onValueChange?: ((value: number) => void) | undefined;
  // onSlidingComplete reports the final snapped value after touch release.
  readonly onSlidingComplete?: ((value: number) => void) | undefined;
  // minimumTrackTintColor styles the selected side of the slider track.
  readonly minimumTrackTintColor?: string | undefined;
  // maximumTrackTintColor styles the unselected side of the slider track.
  readonly maximumTrackTintColor?: string | undefined;
  // thumbTintColor styles the draggable slider thumb.
  readonly thumbTintColor?: string | undefined;
  // onInteractionStart lets parent scroll containers pause while dragging.
  readonly onInteractionStart?: (() => void) | undefined;
  // onInteractionEnd lets parent scroll containers resume after dragging.
  readonly onInteractionEnd?: (() => void) | undefined;
};

// BubbleSlider renders a tactile PanResponder slider without owning persistence.
export function BubbleSlider({
  max,
  min,
  step = 1,
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackTintColor = '#007AFF',
  maximumTrackTintColor = '#E5E5EA',
  thumbTintColor = '#FFFFFF',
  onInteractionStart,
  onInteractionEnd,
}: BubbleSliderProps): ReactElement {
  const containerWidthRef = useRef(0);
  const [localValue, setLocalValue] = useState(value);
  const isInteractingRef = useRef(false);
  const currentValueRef = useRef(value);
  const startValueRef = useRef(value);
  const thumbScale = useMemo((): Animated.Value => new Animated.Value(1), []);
  const [panResponder, setPanResponder] = useState<PanResponderInstance | null>(null);

  useEffect((): void => {
    if (!isInteractingRef.current) {
      setLocalValue(value);
      currentValueRef.current = value;
    }
  }, [value]);

  // updateValue clamps and snaps pointer movement before notifying the parent.
  const updateValue = useCallback(
    (nextValue: number): void => {
      const clampedValue = Math.max(min, Math.min(max, nextValue));
      const steppedValue = Math.round((clampedValue - min) / step) * step + min;

      if (currentValueRef.current !== steppedValue) {
        currentValueRef.current = steppedValue;
        setLocalValue(steppedValue);
        onValueChange?.(steppedValue);
      }
    },
    [max, min, onValueChange, step],
  );

  useEffect((): void => {
    // responder translates horizontal drag distance into the bounded setting value.
    const responder: PanResponderInstance = PanResponder.create({
      onMoveShouldSetPanResponder: (): boolean => true,
      onMoveShouldSetPanResponderCapture: (): boolean => true,
      onPanResponderGrant: (event): void => {
        isInteractingRef.current = true;
        onInteractionStart?.();
        Animated.spring(thumbScale, {
          bounciness: 12,
          toValue: 1.15,
          useNativeDriver: true,
        }).start();

        const width = containerWidthRef.current;
        if (width > 0) {
          const valueRange = max - min;
          const nextValue = (event.nativeEvent.locationX / width) * valueRange + min;
          updateValue(nextValue);
        }

        startValueRef.current = currentValueRef.current;
      },
      onPanResponderMove: (_event, gestureState): void => {
        const width = containerWidthRef.current;
        if (width === 0) {
          return;
        }

        const valueRange = max - min;
        const deltaValue = (gestureState.dx / width) * valueRange;
        updateValue(startValueRef.current + deltaValue);
      },
      onPanResponderRelease: (): void => {
        isInteractingRef.current = false;
        onInteractionEnd?.();
        Animated.spring(thumbScale, {
          bounciness: 8,
          toValue: 1,
          useNativeDriver: true,
        }).start();
        onSlidingComplete?.(currentValueRef.current);
      },
      onPanResponderTerminate: (): void => {
        isInteractingRef.current = false;
        onInteractionEnd?.();
        Animated.spring(thumbScale, {
          bounciness: 8,
          toValue: 1,
          useNativeDriver: true,
        }).start();
        onSlidingComplete?.(currentValueRef.current);
      },
      onPanResponderTerminationRequest: (): boolean => false,
      onStartShouldSetPanResponder: (): boolean => true,
      onStartShouldSetPanResponderCapture: (): boolean => true,
    });

    setPanResponder(responder);
  }, [max, min, onInteractionEnd, onInteractionStart, onSlidingComplete, thumbScale, updateValue]);

  const range = max - min;
  const percentage = range === 0 ? 0 : (localValue - min) / range;
  const fillWidth = `${percentage * 100}%` as const;
  const thumbSize = 20;

  return (
    <View
      onLayout={(event) => {
        containerWidthRef.current = event.nativeEvent.layout.width;
      }}
      style={styles.container}
      {...panResponder?.panHandlers}
    >
      <View pointerEvents="none" style={styles.trackContainer}>
        <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: minimumTrackTintColor,
                width: fillWidth,
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbTintColor,
              borderRadius: thumbSize / 2,
              height: thumbSize,
              left: fillWidth,
              transform: [{ translateX: -thumbSize / 2 }, { scale: thumbScale }],
              width: thumbSize,
            },
          ]}
        />
      </View>
    </View>
  );
}

// styles define stable slider geometry while colors remain caller-owned.
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    height: 40,
    justifyContent: 'center',
    width: '100%',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    borderColor: 'rgba(0,0,0,0.06)',
    borderWidth: 0.5,
    elevation: 6,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4.65,
  },
  track: {
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  trackContainer: {
    justifyContent: 'center',
    width: '100%',
  },
});
