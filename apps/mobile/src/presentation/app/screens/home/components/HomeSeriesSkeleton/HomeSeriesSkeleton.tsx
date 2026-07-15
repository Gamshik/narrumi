import type { ReactElement } from 'react';
import { View } from 'react-native';

import { BubbleSurface } from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { styles } from './HomeSeriesSkeleton.styles';

// HomeSeriesSkeletonProps carries the active semantic palette into loading placeholders.
export type HomeSeriesSkeletonProps = {
  // colors keeps skeleton surfaces and fills correct in both supported themes.
  readonly colors: AppColors;
};

// skeletonRows keeps the initial Home height stable while local series are being resolved.
const skeletonRows: readonly string[] = [
  'first-series-placeholder',
  'second-series-placeholder',
  'third-series-placeholder',
];

// HomeSeriesSkeleton mirrors the populated Home hierarchy without exposing a premature action.
export function HomeSeriesSkeleton({
  colors,
}: HomeSeriesSkeletonProps): ReactElement {
  // seriesPlaceholders materializes stable keyed rows without adding accessible duplicate content.
  const seriesPlaceholders: ReactElement[] = [];

  for (const rowKey of skeletonRows) {
    seriesPlaceholders.push(
      <BubbleSurface colors={colors} key={rowKey} style={styles.card}>
        <View
          style={[
            styles.cardTitle,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        />
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.cardMeta,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          />
          <View
            style={[
              styles.cardProgress,
              { backgroundColor: colors.separator },
            ]}
          />
        </View>
      </BubbleSurface>,
    );
  }

  return (
    <View
      accessibilityLabel="Loading saved series"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.root}
    >
      <BubbleSurface colors={colors} style={styles.action} variant="list">
        <View style={styles.copy}>
          <View
            style={[styles.title, { backgroundColor: colors.backgroundTertiary }]}
          />
          <View style={[styles.subtitle, { backgroundColor: colors.separator }]} />
        </View>
        <View
          style={[
            styles.actionButton,
            { backgroundColor: colors.backgroundTertiary },
          ]}
        />
      </BubbleSurface>

      <View importantForAccessibility="no-hide-descendants" style={styles.list}>
        {seriesPlaceholders}
      </View>
    </View>
  );
}
