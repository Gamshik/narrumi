import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { CefrLevel } from '@domain/index';

import type { AppStyles } from '../types';

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
  return (
    <View style={[styles.levelBadge, styles[`level${level}`]]}>
      <Text style={styles.levelBadgeText}>{level}</Text>
    </View>
  );
}
