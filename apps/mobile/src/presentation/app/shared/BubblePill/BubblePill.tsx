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
  spacing,
  type AppColors,
} from '@presentation/theme';

import { JellyPressable } from '../JellyPressable';

// BubblePillTone names semantic compact pill and badge color roles.
export type BubblePillTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

// BubblePillProps supports passive badges and optional tactile chip behavior.
export type BubblePillProps = Omit<
  PressableProps,
  'children' | 'disabled' | 'style'
> & {
  // children is caller-owned label or icon content rendered inside the pill.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // tone selects the semantic visual role without parsing product data.
  readonly tone?: BubblePillTone;
  // selected marks the pill as active while callers retain selection rules.
  readonly selected?: boolean;
  // disabled blocks press behavior and exposes inactive accessibility state.
  readonly disabled?: boolean;
  // style positions the outer pill without duplicating tokenized chrome.
  readonly style?: StyleProp<ViewStyle>;
  // contentStyle customizes inner layout for label and icon combinations.
  readonly contentStyle?: StyleProp<ViewStyle>;
};

// BubblePill renders compact tokenized badges, chips, and selected pill states.
export function BubblePill({
  accessibilityRole,
  accessibilityState,
  children,
  colors,
  contentStyle,
  disabled = false,
  onPress,
  selected = false,
  style,
  tone = 'neutral',
  ...pressableProps
}: BubblePillProps): ReactElement {
  // resolvedStyle combines theme-aware tone, selected, and disabled visual states.
  const resolvedStyle: ViewStyle = getPillStyle(colors, tone, selected);
  // resolvedAccessibilityState keeps pressable chip state visible to assistive tech.
  const resolvedAccessibilityState: AccessibilityState = {
    ...accessibilityState,
    disabled,
    selected,
  };
  // pillContent is shared so passive badges and pressable chips render identically.
  const pillContent: ReactElement = (
    <View
      style={[
        styles.base,
        selected && styles.selected,
        resolvedStyle,
        disabled && styles.disabled,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return <View style={style}>{pillContent}</View>;
  }

  return (
    <JellyPressable
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={resolvedAccessibilityState}
      disabled={disabled}
      onPress={onPress}
      scaleTo={disabled ? 1 : motion.pressScale}
      containerStyle={style}
      {...pressableProps}
    >
      {pillContent}
    </JellyPressable>
  );
}

// getPillStyle maps compact tones to semantic light/dark theme tokens.
function getPillStyle(
  colors: AppColors,
  tone: BubblePillTone,
  selected: boolean,
): ViewStyle {
  const toneStyles: Record<BubblePillTone, ViewStyle> = {
    neutral: {
      backgroundColor: selected
        ? colors.pillSelectedSurface
        : colors.pillSurface,
      borderColor: selected ? colors.systemBlue : colors.pillBorder,
    },
    primary: {
      backgroundColor: selected
        ? colors.pillSelectedSurface
        : colors.badgeAccentSurface,
      borderColor: colors.systemBlue,
    },
    success: {
      backgroundColor: colors.badgeSuccessSurface,
      borderColor: colors.systemGreen,
    },
    warning: {
      backgroundColor: colors.badgeWarningSurface,
      borderColor: colors.systemOrange,
    },
    danger: {
      backgroundColor: colors.badgeWarningSurface,
      borderColor: colors.systemRed,
    },
  };

  return toneStyles[tone];
}

// styles keep compact chip dimensions stable across labels and selected states.
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selected: {
    transform: [{ scale: motion.selectedScale }],
  },
  disabled: {
    opacity: 0.45,
  },
});
