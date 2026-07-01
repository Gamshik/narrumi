import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// JellyPressableProps extends Pressable with the claymorphic squish controls.
type JellyPressableProps = PressableProps & {
  // children is the pressable content (text, icons, nested views).
  readonly children: PressableProps['children'];
  // containerStyle layouts the animated wrapper (use for flex/alignSelf in rows).
  readonly containerStyle?: StyleProp<ViewStyle>;
  // scaleTo is the pressed-down scale target; smaller means a deeper squish.
  readonly scaleTo?: number;
};

// JellyPressable wraps Pressable with a spring "jelly" squish so every tap feels
// soft and bouncy, matching the Sorbet clay design language. The scale runs on a
// plain Animated.View wrapper (native driver) so the inner Pressable keeps its
// full style contract, including function styles for pressed feedback.
export function JellyPressable({
  children,
  containerStyle,
  onPressIn,
  onPressOut,
  scaleTo = 0.95,
  ...pressableProps
}: JellyPressableProps): ReactElement {
  // scale animates the surface down on touch and springs back with a soft
  // overshoot; a lazy state initializer keeps one Animated.Value across renders.
  const [scale] = useState(() => new Animated.Value(1));

  // handlePressIn squishes the surface immediately when the finger lands.
  const handlePressIn = (event: GestureResponderEvent): void => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 45,
      bounciness: 0,
    }).start();
    onPressIn?.(event);
  };

  // handlePressOut releases the surface with a gentle jelly rebound.
  const handlePressOut = (event: GestureResponderEvent): void => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 14,
    }).start();
    onPressOut?.(event);
  };

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...pressableProps}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
