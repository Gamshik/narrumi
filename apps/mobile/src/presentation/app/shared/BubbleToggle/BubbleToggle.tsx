import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type AccessibilityState,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion, radii, type AppColors } from '@presentation/theme';

import { JellyPressable } from '../JellyPressable';

// BubbleToggleProps exposes a custom switch contract without owning theme state.
export type BubbleToggleProps = Omit<
  PressableProps,
  'children' | 'disabled' | 'onPress' | 'style'
> & {
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // value is the checked state announced to users and assistive technology.
  readonly value: boolean;
  // onValueChange receives the next checked state when the user toggles.
  readonly onValueChange: (value: boolean) => void;
  // disabled blocks toggle changes and exposes inactive accessibility state.
  readonly disabled?: boolean;
  // style positions the outer switch without duplicating its visual chrome.
  readonly style?: StyleProp<ViewStyle>;
};

// BubbleToggle renders the Bubble/Sorbet custom switch used by settings screens.
export function BubbleToggle({
  accessibilityState,
  colors,
  disabled = false,
  onValueChange,
  style,
  value,
  ...pressableProps
}: BubbleToggleProps): ReactElement {
  // animValue tracks the 0-1 transition state for native-driver animation.
  const [animValue] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  }, [value, animValue]);
  // resolvedAccessibilityState announces the real checked and disabled state.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    checked: value,
    disabled,
  };

  // thumbTranslateX interpolates the 0-1 state to slide the high-contrast knob.
  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  // handlePress flips the presentation state through the caller-owned callback.
  const handlePress = (_event: GestureResponderEvent): void => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <JellyPressable
      accessibilityRole="switch"
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      onPress={handlePress}
      scaleTo={disabled ? 1 : motion.pressScale}
      style={[styles.track, disabled && styles.disabled]}
      containerStyle={style}
      {...pressableProps}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.trackBackground,
          { backgroundColor: colors.pillSurface, borderColor: colors.pillBorder },
        ]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.trackBackground,
          {
            backgroundColor: colors.systemGreen,
            borderColor: colors.systemGreen,
            opacity: animValue,
          },
        ]}
      />
      <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbTranslateX }] }]} />
    </JellyPressable>
  );
}

// styles define stable custom-switch dimensions matching native iOS proportions.
const styles = StyleSheet.create({
  track: {
    height: 34,
    justifyContent: 'center',
    padding: 2,
    width: 58,
    borderRadius: radii.pill,
  },
  trackBackground: {
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  thumb: {
    backgroundColor: '#ffffff',
    borderRadius: radii.pill,
    height: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    width: 28,
    elevation: 5,
  },
  disabled: {
    opacity: 0.48,
  },
});
