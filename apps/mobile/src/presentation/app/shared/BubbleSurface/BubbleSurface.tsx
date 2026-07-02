import type { ReactNode, ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  radii,
  shadows,
  spacing,
  type AppColors,
} from '@presentation/theme';

// BubbleSurfaceVariant names the reusable Bubble/Sorbet surface shapes.
export type BubbleSurfaceVariant = 'card' | 'accent' | 'list' | 'hero';

// BubbleSurfaceTone names the semantic accent applied to a surface border.
export type BubbleSurfaceTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

// BubbleSurfaceProps is the public presentation-only contract for surface shells.
export type BubbleSurfaceProps = {
  // children is caller-owned screen content rendered inside the visual shell.
  readonly children: ReactNode;
  // colors provides the active light or dark semantic theme tokens.
  readonly colors: AppColors;
  // variant selects the reusable surface shape and emphasis level.
  readonly variant?: BubbleSurfaceVariant;
  // tone optionally accents the shell without encoding product state rules.
  readonly tone?: BubbleSurfaceTone;
  // style lets callers position the shell while this component owns its chrome.
  readonly style?: StyleProp<ViewStyle>;
};

// BubbleSurface renders token-driven rounded shells for cards, accents, and lists.
export function BubbleSurface({
  children,
  colors,
  style,
  tone = 'neutral',
  variant = 'card',
}: BubbleSurfaceProps): ReactElement {
  // surfaceStyle resolves the theme-aware fill and border for the requested role.
  const surfaceStyle: ViewStyle = {
    backgroundColor: getSurfaceColor(colors, variant),
    borderColor: getToneBorderColor(colors, tone),
  };

  return (
    <View style={[styles.base, styles[variant], surfaceStyle, style]}>
      {children}
    </View>
  );
}

// getSurfaceColor keeps visual variants mapped to semantic light/dark tokens.
function getSurfaceColor(
  colors: AppColors,
  variant: BubbleSurfaceVariant,
): string {
  if (variant === 'hero') {
    return colors.bubbleSurfaceRaised;
  }

  if (variant === 'list') {
    return colors.bubbleSurfaceMuted;
  }

  return colors.bubbleSurface;
}

// getToneBorderColor keeps accent borders semantic and theme-aware.
function getToneBorderColor(
  colors: AppColors,
  tone: BubbleSurfaceTone,
): string {
  const toneBorders: Record<BubbleSurfaceTone, string> = {
    neutral: colors.bubbleBorder,
    primary: colors.systemBlue,
    success: colors.systemGreen,
    warning: colors.systemOrange,
    danger: colors.systemRed,
  };

  return toneBorders[tone];
}

// styles define only stable layout chrome; colors are resolved per active theme.
const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.soft,
  },
  accent: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.clay,
  },
  list: {
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.clay,
  },
});
