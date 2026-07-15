import { LinearGradient } from 'expo-linear-gradient';
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
  // gradientColors creates a restrained top-lit material without changing layout.
  const gradientColors: readonly [string, string] = getSurfaceGradient(
    colors,
    tone,
    variant,
  );

  return (
    <View style={[styles.base, styles[variant], surfaceStyle, style]}>
      <LinearGradient
        colors={gradientColors}
        end={{ x: 0.86, y: 1 }}
        pointerEvents="none"
        start={{ x: 0.08, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[styles.sheen, { backgroundColor: colors.bubbleBorder }]}
      />
      {children}
    </View>
  );
}

// getSurfaceGradient maps hierarchy to a subtle material gradient.
function getSurfaceGradient(
  colors: AppColors,
  tone: BubbleSurfaceTone,
  variant: BubbleSurfaceVariant,
): readonly [string, string] {
  if (tone === 'primary') {
    return [colors.systemPurple, colors.systemBlue];
  }

  if (tone === 'success') {
    return [colors.badgeSuccessSurface, colors.bubbleSurface];
  }

  if (tone === 'warning') {
    return [colors.badgeWarningSurface, colors.bubbleSurface];
  }

  if (tone === 'danger') {
    return [`${colors.systemRed}2f`, colors.bubbleSurface];
  }

  if (variant === 'hero' || variant === 'accent') {
    return [colors.bubbleSurfaceRaised, colors.bubbleSurface];
  }

  if (variant === 'list') {
    return [colors.bubbleSurfaceMuted, colors.bubbleSurfaceMuted];
  }

  return [colors.bubbleSurfaceRaised, colors.bubbleSurface];
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
    neutral: 'transparent',
    primary: 'transparent',
    success: `${colors.systemGreen}55`,
    warning: `${colors.systemOrange}55`,
    danger: `${colors.systemRed}55`,
  };

  return toneBorders[tone];
}

// styles define only stable layout chrome; colors are resolved per active theme.
const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheen: {
    borderRadius: 110,
    height: 118,
    left: -32,
    opacity: 0.16,
    position: 'absolute',
    top: -74,
    transform: [{ rotate: '-12deg' }],
    width: 220,
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
