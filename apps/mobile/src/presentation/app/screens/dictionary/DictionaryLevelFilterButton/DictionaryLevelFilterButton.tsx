import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { LevelFilter } from '@presentation/app/types';
import { JellyPressable } from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { dictionaryLevelFilterButtonStyles as styles } from './DictionaryLevelFilterButton.styles';

// DictionaryLevelFilterButtonProps connects the search-row affordance to modal visibility.
type DictionaryLevelFilterButtonProps = {
  // colors supplies the live Sorbet glass and accent palette.
  readonly colors: AppColors;
  // level is shown as a small status badge whenever the catalog is filtered.
  readonly level: LevelFilter;
  // onPress opens the caller-owned CEFR selection modal.
  readonly onPress: () => void;
};

// DictionaryLevelFilterButton renders a stable vector filter icon with compact active state.
export function DictionaryLevelFilterButton({
  colors,
  level,
  onPress,
}: DictionaryLevelFilterButtonProps): ReactElement {
  // isFiltered distinguishes the full catalog from one active CEFR constraint.
  const isFiltered: boolean = level !== 'ALL';
  // iconColor keeps the control discoverable while active state remains visible in the badge.
  const iconColor: string = isFiltered
    ? colors.systemBlue
    : colors.labelSecondary;

  return (
    <JellyPressable
      accessibilityHint="Opens a compact CEFR level selector"
      accessibilityLabel={
        isFiltered
          ? `Filter vocabulary by level, currently ${level}`
          : 'Filter vocabulary by CEFR level'
      }
      accessibilityRole="button"
      containerStyle={styles.container}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: isFiltered
            ? colors.badgeAccentSurface
            : colors.pillSurface,
          borderColor: isFiltered ? colors.systemPurple : colors.pillBorder,
        },
      ]}
    >
      <Svg
        aria-hidden
        height={22}
        pointerEvents="none"
        viewBox="0 0 24 24"
        width={22}
      >
        <Path
          d="M4 7h4m4 0h8M4 17h8m4 0h4"
          fill="none"
          stroke={iconColor}
          strokeLinecap="round"
          strokeWidth={2}
        />
        <Circle cx={10} cy={7} fill={colors.bubbleSurfaceRaised} r={2.2} stroke={iconColor} strokeWidth={1.7} />
        <Circle cx={14} cy={17} fill={colors.bubbleSurfaceRaised} r={2.2} stroke={iconColor} strokeWidth={1.7} />
      </Svg>
      {level !== 'ALL' ? (
        <ActiveLevelBadge colors={colors} level={level} />
      ) : null}
    </JellyPressable>
  );
}

// ActiveLevelBadge isolates the absolute CEFR status marker from the SVG glyph.
function ActiveLevelBadge({
  colors,
  level,
}: {
  // colors supplies the active branded badge fill.
  readonly colors: AppColors;
  // level is guaranteed to be a concrete CEFR code by the parent guard.
  readonly level: Exclude<LevelFilter, 'ALL'>;
}): ReactElement {
  return (
    <View style={[styles.activeBadge, { backgroundColor: colors.systemBlue }]}>
      <Text style={styles.activeBadgeText}>{level}</Text>
    </View>
  );
}
