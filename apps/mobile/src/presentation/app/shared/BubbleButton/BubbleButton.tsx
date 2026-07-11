import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode, ReactElement } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityState,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  motion,
  radii,
  shadows,
  spacing,
  type AppColors,
} from '@presentation/theme';

import { JellyPressable } from '../JellyPressable';

// BubbleButtonVariant names the shared tactile button emphasis levels.
export type BubbleButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'inverted';

// BubbleButtonProps exposes Pressable intent while keeping visuals token-owned.
export type BubbleButtonProps = Omit<
  PressableProps,
  'children' | 'disabled' | 'style'
> & {
  // children is caller-owned label or icon content rendered inside the button.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // variant selects the visual emphasis without owning product behavior.
  readonly variant?: BubbleButtonVariant;
  // disabled blocks touch handling and exposes inactive accessibility state.
  readonly disabled?: boolean;
  // selected marks toggle-like controls without deciding why they are active.
  readonly selected?: boolean;
  // style lets callers position the button without duplicating its base chrome.
  readonly style?: StyleProp<ViewStyle>;
  // contentStyle lets callers tune inner alignment for icon and text layouts.
  readonly contentStyle?: StyleProp<ViewStyle>;
};

// BubbleButton wraps JellyPressable with tokenized Bubble/Sorbet button chrome.
export function BubbleButton({
  accessibilityRole = 'button',
  accessibilityState,
  children,
  colors,
  contentStyle,
  disabled = false,
  selected = false,
  style,
  variant = 'primary',
  ...pressableProps
}: BubbleButtonProps): ReactElement {
  // resolvedAccessibilityState ensures disabled and selected controls are announced.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    disabled,
    selected,
  };
  // buttonStyle resolves semantic colors after the active theme is known.
  const buttonStyle: ViewStyle = getButtonStyle(colors, variant, selected);
  // gradientColors gives emphasized controls a soft inflated light direction.
  const gradientColors: readonly [string, string] = getButtonGradient(
    colors,
    variant,
    selected,
  );

  return (
    <JellyPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={resolvedAccessibilityState}
      containerStyle={style}
      disabled={disabled}
      scaleTo={disabled ? 1 : motion.pressScale}
      style={[
        styles.base,
        styles[variant],
        buttonStyle,
        disabled && styles.disabled,
        contentStyle,
      ]}
      {...pressableProps}
    >
      <LinearGradient
        colors={gradientColors}
        end={{ x: 0.88, y: 1 }}
        pointerEvents="none"
        start={{ x: 0.08, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.sheen, { backgroundColor: colors.bubbleBorder }]}
      />
      {children}
    </JellyPressable>
  );
}

// getButtonGradient keeps visual depth semantic for every button emphasis.
function getButtonGradient(
  colors: AppColors,
  variant: BubbleButtonVariant,
  selected: boolean,
): readonly [string, string] {
  if (variant === 'primary') {
    return [colors.systemPurple, colors.systemBlue];
  }

  if (variant === 'danger') {
    return [colors.systemPink, colors.systemRed];
  }

  if (variant === 'inverted') {
    return ['#ffffff', '#eee9ff'];
  }

  if (selected) {
    return [colors.pillSelectedSurface, colors.badgeAccentSurface];
  }

  if (variant === 'secondary') {
    return [colors.bubbleSurfaceRaised, colors.bubbleSurface];
  }

  return [colors.backgroundTertiary, colors.backgroundTertiary];
}

// getButtonStyle maps button variants to semantic light/dark color tokens.
function getButtonStyle(
  colors: AppColors,
  variant: BubbleButtonVariant,
  selected: boolean,
): ViewStyle {
  const variantStyles: Record<BubbleButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: colors.systemBlue,
      borderColor: colors.systemBlue,
    },
    secondary: {
      backgroundColor: selected
        ? colors.pillSelectedSurface
        : colors.bubbleSurface,
      borderColor: selected ? colors.systemBlue : colors.bubbleBorder,
    },
    ghost: {
      backgroundColor: selected
        ? colors.pillSelectedSurface
        : colors.backgroundTertiary,
      borderColor: selected ? colors.systemBlue : colors.pillBorder,
    },
    danger: {
      backgroundColor: colors.systemRed,
      borderColor: colors.systemRed,
    },
    inverted: {
      backgroundColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.76)',
    },
  };

  return variantStyles[variant];
}

// styles define reusable button sizing and motion-ready selected transforms.
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primary: {
    ...shadows.clay,
  },
  secondary: {
    ...shadows.soft,
  },
  ghost: {},
  danger: {
    ...shadows.soft,
  },
  inverted: {
    ...shadows.soft,
  },
  sheen: {
    borderRadius: 70,
    height: 58,
    left: -16,
    opacity: 0.18,
    position: 'absolute',
    top: -34,
    transform: [{ rotate: '-12deg' }],
    width: 132,
  },
  disabled: {
    opacity: 0.45,
  },
});
