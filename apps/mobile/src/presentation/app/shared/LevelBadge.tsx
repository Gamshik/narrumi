import type { ReactElement } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { CefrLevel } from '@domain/index';
import { darkColors, lightColors, type AppColors } from '@presentation/theme';

import type { AppStyles } from '../types';
import { BubblePill, type BubblePillTone } from './BubblePill';

// LevelBadgeProps defines the CEFR badge contract for dictionary rows.
type LevelBadgeProps = {
  // level selects the badge label and matching theme style.
  readonly level: CefrLevel;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// LevelBadge renders a compact visual marker for a supported CEFR level.
export function LevelBadge({
  level,
  styles,
}: LevelBadgeProps): ReactElement {
  // colors resolves the active light/dark token set from the generated style contract.
  const colors: AppColors = resolveColorsFromStyles(styles);
  // tone keeps CEFR levels mapped to compact semantic badge roles.
  const tone: BubblePillTone = getLevelTone(level);

  return (
    <BubblePill
      colors={colors}
      contentStyle={[styles.levelBadge, styles[`level${level}`]]}
      tone={tone}
    >
      <Text style={styles.levelBadgeText}>{level}</Text>
    </BubblePill>
  );
}

// resolveColorsFromStyles preserves the public badge props while feeding BubblePill tokens.
function resolveColorsFromStyles(styles: AppStyles): AppColors {
  const safeAreaStyle = StyleSheet.flatten(styles.safeArea);

  return safeAreaStyle.backgroundColor === darkColors.backgroundPrimary
    ? darkColors
    : lightColors;
}

// getLevelTone maps CEFR levels to reusable BubblePill visual roles.
function getLevelTone(level: CefrLevel): BubblePillTone {
  const toneByLevel: Record<CefrLevel, BubblePillTone> = {
    A1: 'success',
    A2: 'primary',
    B1: 'warning',
    B2: 'primary',
    C1: 'danger',
    C2: 'danger',
  };

  return toneByLevel[level];
}
