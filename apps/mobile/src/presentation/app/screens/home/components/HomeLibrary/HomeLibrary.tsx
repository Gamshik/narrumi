import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { LocalSeriesSetupDraft, Series } from '@domain/index';
import type { AppColors } from '@presentation/theme';

import { BubbleSurface } from '../../../../shared';
import { participationModeLabels } from '../../../seriesSetupForm';
import { SwipeableSeriesCard } from '../SwipeableSeriesCard';
import { HomeLibraryHeader } from './HomeLibraryHeader';
import { SeriesDraftCard } from './SeriesDraftCard';
import { styles } from './HomeLibrary.styles';

// HomeLibraryProps contains collection state while HomeScreen retains loading and modal ownership.
type HomeLibraryProps = {
  // colors provides the active light or dark Sorbet tokens.
  readonly colors: AppColors;
  // drafts contains every unfinished new-series snapshot stored on this device.
  readonly drafts: readonly LocalSeriesSetupDraft[];
  // hasOpenSwipe prevents a cleanup tap from opening a different library row.
  readonly hasOpenSwipe: boolean;
  // openSwipeItemId identifies the series or draft with an exposed delete action.
  readonly openSwipeItemId: string | undefined;
  // series contains the completed local series collection.
  readonly series: readonly Series[];
  // onCreateSeries opens a clean setup flow from the explicit library action.
  readonly onCreateSeries: () => void;
  // onDeleteSeries forwards destructive intent to the existing confirmation flow.
  readonly onDeleteSeries: (series: Series, onCancel?: () => void) => void;
  // onDeleteDraft forwards one local snapshot to its confirmation flow.
  readonly onDeleteDraft: (
    draft: LocalSeriesSetupDraft,
    onCancel?: () => void,
  ) => void;
  // onOpenSeries navigates into one completed personal series.
  readonly onOpenSeries: (seriesId: string) => void;
  // onOpenSwipeItemChange coordinates the single open row across both collections.
  readonly onOpenSwipeItemChange: (
    itemId: string,
    shouldOpen: boolean,
  ) => void;
  // onResumeDraft reopens the four-card setup flow from local values.
  readonly onResumeDraft: (draftId: string) => void;
};

// HomeLibrary keeps unfinished and completed work visible in one stable library.
export function HomeLibrary({
  colors,
  drafts,
  hasOpenSwipe,
  openSwipeItemId,
  series,
  onCreateSeries,
  onDeleteDraft,
  onDeleteSeries,
  onOpenSeries,
  onOpenSwipeItemChange,
  onResumeDraft,
}: HomeLibraryProps): ReactElement {
  // hasDraft controls only the recovery section, never the page's navigation structure.
  const hasDraft: boolean = drafts.length > 0;

  return (
    <View style={styles.library}>
      <HomeLibraryHeader
        colors={colors}
        onCreateSeries={onCreateSeries}
      />

      {hasDraft ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.systemPurple }]}>
            CONTINUE SETUP
          </Text>
          <View style={styles.list}>
            {drafts.map(
              // draft is one independent local setup snapshot with its own resume target.
              (draft: LocalSeriesSetupDraft): ReactElement => (
                <SeriesDraftCard
                  colors={colors}
                  draft={draft}
                  hasOpenSwipe={hasOpenSwipe}
                  isOpen={draft.draftId === openSwipeItemId}
                  key={draft.draftId}
                  onOpenChange={
                    // shouldOpen reports whether this draft owns the shared delete lane.
                    (shouldOpen: boolean): void =>
                      onOpenSwipeItemChange(draft.draftId, shouldOpen)
                  }
                  onRequestDelete={
                    // onCancel closes the draft lane when confirmation is dismissed.
                    (onCancel: () => void): void =>
                      onDeleteDraft(draft, onCancel)
                  }
                  onResume={(): void => onResumeDraft(draft.draftId)}
                />
              ),
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.systemPurple }]}>
          YOUR SERIES
        </Text>
        {series.length > 0 ? (
          <View style={styles.list}>
            {series.map(
              // item is one completed series rendered with the existing swipe interaction.
              (item: Series): ReactElement => (
                <SwipeableSeriesCard
                  colors={colors}
                  hasOpenSwipe={hasOpenSwipe}
                  isDeleting={false}
                  isOpen={item.id === openSwipeItemId}
                  key={item.id}
                  modeLabel={participationModeLabels[item.participationMode]}
                  series={item}
                  onOpenChange={
                    // shouldOpen reports whether this row now owns the shared delete lane.
                    (shouldOpen: boolean): void =>
                      onOpenSwipeItemChange(item.id, shouldOpen)
                  }
                  onOpenSeries={onOpenSeries}
                  onRequestDelete={
                    // onCancel closes the swipe lane when confirmation is dismissed.
                    (onCancel: () => void): void =>
                      onDeleteSeries(item, onCancel)
                  }
                />
              ),
            )}
          </View>
        ) : (
          <BubbleSurface
            colors={colors}
            style={styles.emptySurface}
            tone="neutral"
            variant="list"
          >
            <Text style={[styles.emptyCopy, { color: colors.labelSecondary }]}>
              {hasDraft
                ? 'Finish a draft to add your first series.'
                : 'Create your first series to begin a new story.'}
            </Text>
          </BubbleSurface>
        )}
      </View>
    </View>
  );
}
