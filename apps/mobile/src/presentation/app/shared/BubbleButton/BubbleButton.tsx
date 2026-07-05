import type { ReactNode, ReactElement } from 'react';
import {
  StyleSheet,
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
export type BubbleButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

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
      {children}
    </JellyPressable>
  );
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
  disabled: {
    opacity: 0.45,
  },
});
