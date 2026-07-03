import type { ReactElement } from 'react';
import {
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
  // resolvedAccessibilityState announces the real checked and disabled state.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    checked: value,
    disabled,
  };
  // trackStyle keeps active and inactive switch surfaces readable in both themes.
  const trackStyle: ViewStyle = {
    backgroundColor: value ? colors.systemGreen : colors.pillSurface,
    borderColor: value ? colors.systemGreen : colors.pillBorder,
  };
  // thumbStyle slides the high-contrast knob without changing layout dimensions.
  const thumbStyle: ViewStyle = {
    transform: [{ translateX: value ? 22 : 0 }],
  };

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
      style={[styles.track, trackStyle, disabled && styles.disabled]}
      containerStyle={style}
      {...pressableProps}
    >
      <View style={[styles.thumb, thumbStyle]} />
    </JellyPressable>
  );
}

// styles define stable custom-switch dimensions matching native iOS proportions.
const styles = StyleSheet.create({
  track: {
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    padding: 2,
    width: 58,
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
  },
  disabled: {
    opacity: 0.48,
  },
});
