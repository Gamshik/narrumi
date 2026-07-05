import type { ReactElement } from 'react';
import { StyleSheet, Text, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';
import { BubblePill, type BubblePillTone } from '../BubblePill';
import { BubbleSurface, type BubbleSurfaceTone, type BubbleSurfaceVariant } from '../BubbleSurface';

// BubbleStatusTone defines the semantic status roles for the primitive.
export type BubbleStatusTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'loading'
  | 'disabled'
  | 'offline';

// BubbleStatusVariant defines the layout shape of the status primitive.
export type BubbleStatusVariant = 'compact' | 'row' | 'card';

// BubbleStatusProps is the display-only contract for status badges and rows.
export type BubbleStatusProps = {
  // colors provides the active theme tokens.
  readonly colors: AppColors;
  // tone determines the semantic visual treatment (e.g. success, error).
  readonly tone: BubbleStatusTone;
  // title is the primary status message.
  readonly title: string;
  // message provides optional secondary detail for larger variants.
  readonly message?: string;
  // variant determines the layout shape (pill, row, or full card).
  readonly variant?: BubbleStatusVariant;
  // accessibilityRole lets callers assign proper semantics (e.g., alert).
  readonly accessibilityRole?: AccessibilityRole;
  // style allows callers to position the status block.
  readonly style?: StyleProp<ViewStyle>;
};

// BubbleStatus renders tokenized offline, loading, error, and success states
// by composing existing Bubble/Sorbet primitives. It does not import app logic.
export function BubbleStatus({
  colors,
  tone,
  title,
  message,
  variant = 'compact',
  accessibilityRole = 'text',
  style,
}: BubbleStatusProps): ReactElement {
  // mapStatusToSurfaceTone maps the broader status tones to surface border tones.
  const mapStatusToSurfaceTone = (t: BubbleStatusTone): BubbleSurfaceTone => {
    switch (t) {
      case 'success':
        return 'success';
      case 'warning':
      case 'offline':
        return 'warning';
      case 'error':
        return 'danger';
      case 'loading':
      case 'disabled':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  // mapStatusToPillTone maps status to compact badge colors.
  const mapStatusToPillTone = (t: BubbleStatusTone): BubblePillTone => {
    switch (t) {
      case 'success':
        return 'success';
      case 'warning':
      case 'offline':
        return 'warning';
      case 'error':
        return 'danger';
      case 'loading':
        return 'primary';
      case 'disabled':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  if (variant === 'compact') {
    return (
      <BubblePill
        accessibilityRole={accessibilityRole}
        accessibilityState={tone === 'disabled' ? { disabled: true } : undefined}
        colors={colors}
        disabled={tone === 'disabled' || tone === 'loading'}
        style={style}
        tone={mapStatusToPillTone(tone)}
      >
        <Text style={[styles.title, { color: colors.labelPrimary }]}>
          {title}
        </Text>
      </BubblePill>
    );
  }

  const surfaceVariant: BubbleSurfaceVariant = variant === 'card' ? 'card' : 'list';
  const surfaceStyle: ViewStyle = {
    backgroundColor: getStatusBackgroundColor(colors, tone),
  };

  return (
    <BubbleSurface
      colors={colors}
      style={[surfaceStyle, style]}
      tone={mapStatusToSurfaceTone(tone)}
      variant={surfaceVariant}
    >
      <View
        accessibilityRole={accessibilityRole}
        accessibilityState={tone === 'disabled' ? { disabled: true } : undefined}
        style={styles.content}
      >
        <Text style={[styles.title, { color: colors.labelPrimary }]}>
          {title}
        </Text>
        {message ? (
          <Text style={[styles.message, { color: colors.labelSecondary }]}>
            {message}
          </Text>
        ) : null}
      </View>
    </BubbleSurface>
  );
}

// getStatusBackgroundColor provides light tints for surface states.
function getStatusBackgroundColor(
  colors: AppColors,
  tone: BubbleStatusTone,
): string {
  switch (tone) {
    case 'success':
      return colors.badgeSuccessSurface;
    case 'warning':
    case 'offline':
      return colors.badgeWarningSurface;
    case 'error':
      return `${colors.systemRed}1f`;
    case 'loading':
    case 'disabled':
      return colors.badgeNeutralSurface;
    default:
      return colors.badgeNeutralSurface;
  }
}

const styles = StyleSheet.create({
  content: {
    gap: 4,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 13,
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
