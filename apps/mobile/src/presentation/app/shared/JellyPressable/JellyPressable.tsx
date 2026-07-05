import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  Pressable,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@presentation/theme';

// JellyPressableProps extends Pressable with the claymorphic squish controls.
type JellyPressableProps = PressableProps & {
  // children is the pressable content (text, icons, nested views).
  readonly children: PressableProps['children'];
  // containerStyle layouts the non-animated wrapper around the pressed surface.
  readonly containerStyle?: StyleProp<ViewStyle>;
  // pressAnimationDelayMs defers tap feedback so gesture-driven parents can claim swipes first.
  readonly pressAnimationDelayMs?: number;
  // pressedOpacityTo is the active press opacity target for surfaces that may reveal content behind them.
  readonly pressedOpacityTo?: number;
  // scaleTo is the pressed-down scale target; smaller means a deeper squish.
  readonly scaleTo?: number;
};

// JellyPressable wraps Pressable with a spring "jelly" squish so every tap feels
// soft and bouncy, matching the Sorbet clay design language. The scale runs on a
// transform-only Animated.View wrapper (native driver) so layout styles never
// reach the native animated module.
export function JellyPressable({
  children,
  containerStyle,
  onPressIn,
  onPressOut,
  pressAnimationDelayMs = 0,
  pressedOpacityTo = motion.pressedOpacity,
  scaleTo = motion.pressScale,
  ...pressableProps
}: JellyPressableProps): ReactElement {
  // scale animates the surface down on touch and springs back with a soft
  // overshoot; a lazy state initializer keeps one Animated.Value across renders.
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(1));
  const isPressingRef = useRef(false);
  const pressAnimationTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  useEffect((): (() => void) => {
    return (): void => {
      if (pressAnimationTimerRef.current) {
        clearTimeout(pressAnimationTimerRef.current);
      }
    };
  }, []);

  // startPressAnimation runs the shared tactile press feedback after any caller delay.
  const startPressAnimation = (): void => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();
    Animated.spring(opacity, {
      toValue: pressedOpacityTo,
      useNativeDriver: true,
      speed: motion.springSpeed,
      bounciness: motion.springBounciness,
    }).start();
  };

  // releasePressAnimation restores the surface after a tap or cancelled touch.
  const releasePressAnimation = (): void => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: motion.releaseSpringSpeed,
      bounciness: motion.releaseSpringBounciness,
    }).start();
    Animated.spring(opacity, {
      toValue: 1,
      useNativeDriver: true,
      speed: motion.releaseSpringSpeed,
      bounciness: motion.releaseSpringBounciness,
    }).start();
  };

  // handlePressIn squishes the surface immediately or after the caller's gesture delay.
  const handlePressIn = (event: GestureResponderEvent): void => {
    isPressingRef.current = true;

    if (pressAnimationDelayMs > 0) {
      pressAnimationTimerRef.current = setTimeout((): void => {
        pressAnimationTimerRef.current = undefined;

        if (isPressingRef.current) {
          startPressAnimation();
        }
      }, pressAnimationDelayMs);
    } else {
      startPressAnimation();
    }

    onPressIn?.(event);
  };

  // handlePressOut releases the surface with a gentle jelly rebound.
  const handlePressOut = (event: GestureResponderEvent): void => {
    isPressingRef.current = false;

    if (pressAnimationTimerRef.current) {
      clearTimeout(pressAnimationTimerRef.current);
      pressAnimationTimerRef.current = undefined;
    }

    releasePressAnimation();
    onPressOut?.(event);
  };

  return (
    <View style={containerStyle}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          {...pressableProps}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
