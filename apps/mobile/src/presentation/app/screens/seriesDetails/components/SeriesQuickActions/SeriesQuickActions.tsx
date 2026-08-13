import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { BubbleSurface, JellyPressable } from '../../../../shared';
import { seriesQuickActionsStyles } from './SeriesQuickActions.styles';

// SeriesQuickActionsProps carries only the two closely related series destinations.
export type SeriesQuickActionsProps = {
  // colors supplies the active Sorbet palette.
  readonly colors: AppColors;
  // hasEpisodeInProgress changes the primary action from setup to continuation.
  readonly hasEpisodeInProgress: boolean;
  // hasEpisodes controls whether a complete-series reading destination exists.
  readonly hasEpisodes: boolean;
  // onPrimaryAction starts episode setup or resumes the unfinished episode.
  readonly onPrimaryAction: () => void;
  // onReadSeries opens the saved series as one continuous reading flow.
  readonly onReadSeries: () => void;
};

// SeriesQuickActions groups the next episode action and full-series reading without extra copy.
export function SeriesQuickActions({
  colors,
  hasEpisodeInProgress,
  hasEpisodes,
  onPrimaryAction,
  onReadSeries,
}: SeriesQuickActionsProps): ReactElement {
  // primaryLabel names the episode outcome instead of the setup step used to reach it.
  const primaryLabel: string = hasEpisodeInProgress
    ? 'Continue'
    : hasEpisodes
      ? 'Next episode'
      : 'First episode';
  // primaryHint explains the destination accurately for accessibility without visible copy.
  const primaryHint: string = hasEpisodeInProgress
    ? 'Resumes the unfinished episode'
    : hasEpisodes
      ? 'Opens setup for the next episode'
      : 'Opens setup for the first episode';

  return (
    <BubbleSurface
      colors={colors}
      style={seriesQuickActionsStyles.container}
      variant="list"
    >
      <JellyPressable
        accessibilityHint={primaryHint}
        accessibilityLabel={primaryLabel}
        accessibilityRole="button"
        containerStyle={seriesQuickActionsStyles.action}
        onPress={onPrimaryAction}
        style={seriesQuickActionsStyles.actionContent}
      >
        <Text
          numberOfLines={1}
          style={[
            seriesQuickActionsStyles.primaryLabel,
            { color: colors.systemPurple },
          ]}
        >
          {primaryLabel}
        </Text>
      </JellyPressable>
      {hasEpisodes ? (
        <>
          <View
            pointerEvents="none"
            style={[
              seriesQuickActionsStyles.divider,
              { backgroundColor: colors.separator },
            ]}
          />
          <JellyPressable
            accessibilityHint="Opens all saved episodes as one continuous story"
            accessibilityLabel="Read full series"
            accessibilityRole="button"
            containerStyle={seriesQuickActionsStyles.action}
            onPress={onReadSeries}
            style={seriesQuickActionsStyles.actionContent}
          >
            <Text
              numberOfLines={1}
              style={[
                seriesQuickActionsStyles.secondaryLabel,
                { color: colors.labelPrimary },
              ]}
            >
              Read all
            </Text>
          </JellyPressable>
        </>
      ) : null}
    </BubbleSurface>
  );
}
