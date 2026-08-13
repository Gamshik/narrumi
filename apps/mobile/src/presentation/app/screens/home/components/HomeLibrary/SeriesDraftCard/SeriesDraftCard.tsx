import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { LocalSeriesSetupDraft } from '@domain/index';
import type { AppColors } from '@presentation/theme';

import { BubbleSurface } from '../../../../../shared';
import { SwipeableLibraryCard } from '../../SwipeableLibraryCard';
import {
  getSeriesDraftSummary,
  type SeriesDraftSummary,
} from '../homeLibraryState';
import { styles } from './SeriesDraftCard.styles';

// SeriesDraftCardProps connects one local setup snapshot to its resume action.
type SeriesDraftCardProps = {
  // colors provides the active light or dark Sorbet tokens.
  readonly colors: AppColors;
  // draft contains incomplete setup values already persisted on this device.
  readonly draft: LocalSeriesSetupDraft;
  // hasOpenSwipe prevents a cleanup tap from resuming while any delete lane is visible.
  readonly hasOpenSwipe: boolean;
  // isOpen controls whether this draft owns the shared delete lane.
  readonly isOpen: boolean;
  // onOpenChange coordinates single-open-row ownership in Home.
  readonly onOpenChange: (isOpen: boolean) => void;
  // onRequestDelete opens draft confirmation and receives a lane-close callback.
  readonly onRequestDelete: (onCancel: () => void) => void;
  // onResume opens the existing four-card creation flow with this snapshot.
  readonly onResume: () => void;
};

// SeriesDraftCard renders one tactile local-only row that resumes series setup.
export function SeriesDraftCard({
  colors,
  draft,
  hasOpenSwipe,
  isOpen,
  onOpenChange,
  onRequestDelete,
  onResume,
}: SeriesDraftCardProps): ReactElement {
  // summary keeps visible copy aligned with the same validation rules used by the setup flow.
  const summary: SeriesDraftSummary = getSeriesDraftSummary(draft);
  // stepLabel describes progress without presenting incomplete fields as an error state.
  const stepLabel: string = `${summary.completedStepCount} of 4 setup steps complete`;

  return (
    <SwipeableLibraryCard
      accessibilityLabel={`${summary.title}, ${summary.modeLabel}, ${stepLabel}`}
      colors={colors}
      hasOpenSwipe={hasOpenSwipe}
      isOpen={isOpen}
      itemKind="draft"
      label={summary.title}
      onOpen={onResume}
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
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.progressMarker,
            {
              backgroundColor: colors.badgeAccentSurface,
              borderColor: colors.pillBorder,
            },
          ]}
        >
          <Text style={[styles.progressText, { color: colors.systemBlue }]}>
            {summary.completedStepCount}/4
          </Text>
        </View>

        <View style={styles.copy}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.title, { color: colors.labelPrimary }]}
          >
            {summary.title}
          </Text>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.meta, { color: colors.labelSecondary }]}
          >
            {summary.modeLabel} setup
          </Text>
        </View>
      </BubbleSurface>
    </SwipeableLibraryCard>
  );
}
