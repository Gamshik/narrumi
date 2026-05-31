import { Text, View } from 'react-native';

import type { CefrLevel } from '@domain/index';

import type { AppStyles } from '../types';

export function LevelBadge({
  level,
  styles,
}: {
  readonly level: CefrLevel;
  readonly styles: AppStyles;
}) {
  return (
    <View style={[styles.levelBadge, styles[`level${level}`]]}>
      <Text style={styles.levelBadgeText}>{level}</Text>
    </View>
  );
}
