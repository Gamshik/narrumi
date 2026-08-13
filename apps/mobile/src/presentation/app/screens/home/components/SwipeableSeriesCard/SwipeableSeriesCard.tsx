import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { Series } from '@domain/index';
import {
  BubblePill,
  BubbleStatus,
  BubbleSurface,
} from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { SwipeableLibraryCard } from '../SwipeableLibraryCard';
import { styles } from './SwipeableSeriesCard.styles';

// SwipeableSeriesCardProps describes one saved-series row and its controlled reveal state.
export type SwipeableSeriesCardProps = {
  // colors provides semantic light or dark Sorbet tokens.
  readonly colors: AppColors;
  // modeLabel is the compact product-facing label for learner participation.
  readonly modeLabel: string;
  // hasOpenSwipe reports whether any row in the list currently owns the action lane.
  readonly hasOpenSwipe: boolean;
  // isDeleting disables repeated destructive actions while persistence is running.
  readonly isDeleting: boolean;
  // isOpen controls whether this row owns the revealed snap point.
  readonly isOpen: boolean;
  // series supplies the visible saved-series metadata and stable identifier.
  readonly series: Series;
  // onOpenChange requests this row's controlled open or closed state.
  readonly onOpenChange: (isOpen: boolean) => void;
  // onOpenSeries navigates to the selected series after an ordinary card tap.
  readonly onOpenSeries: (seriesId: string) => void;
  // onRequestDelete opens the existing confirmation flow and receives a close callback.
  readonly onRequestDelete: (onCancel: () => void) => void;
};

// SwipeableSeriesCard supplies completed-series content to the shared swipe interaction.
export function SwipeableSeriesCard({
  colors,
  modeLabel,
  hasOpenSwipe,
  isDeleting,
  isOpen,
  series,
  onOpenChange,
  onOpenSeries,
  onRequestDelete,
}: SwipeableSeriesCardProps): ReactElement {
  return (
    <SwipeableLibraryCard
      accessibilityLabel={`${series.title}, ${modeLabel} series`}
      colors={colors}
      hasOpenSwipe={hasOpenSwipe}
      isDisabled={isDeleting}
      isOpen={isOpen}
      itemKind="series"
      label={series.title}
      onOpen={(): void => onOpenSeries(series.id)}
      onOpenChange={onOpenChange}
      onRequestDelete={onRequestDelete}
    >
      <BubbleSurface
        colors={colors}
        style={[
          styles.cardSurface,
          { backgroundColor: colors.bubbleSurfaceRaised },
        ]}
        tone="neutral"
        variant="list"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.title, { color: colors.labelPrimary }]}
            >
              {series.title}
            </Text>
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[styles.meta, { color: colors.labelSecondary }]}
            >
              {modeLabel} · Personal series
            </Text>
          </View>
          <BubblePill colors={colors} style={styles.badge} tone="primary">
            <Text
              style={[styles.badgeText, { color: colors.systemBlue }]}
            >
              SERIES
            </Text>
          </BubblePill>
        </View>
        {isDeleting ? (
          <View style={styles.deletingRow}>
            <BubbleStatus
              colors={colors}
              title="Deleting"
              tone="loading"
              variant="compact"
            />
          </View>
        ) : null}
      </BubbleSurface>
    </SwipeableLibraryCard>
  );
}
