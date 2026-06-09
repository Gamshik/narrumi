import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type { Episode, Series, SeriesMemory } from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';

// SeriesDetailsScreenProps carries route params and navigation callbacks.
type SeriesDetailsScreenProps = {
  // seriesId identifies the selected local story.
  readonly seriesId: string;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onBack returns to the stories list.
  readonly onBack: () => void;
  // onPrepareEpisode opens Story Words setup for this series.
  readonly onPrepareEpisode: (seriesId: string) => void;
  // onOpenEpisode reopens a saved episode in the reader.
  readonly onOpenEpisode: (episodeId: string) => void;
  // onReadSeries opens the complete saved series timeline.
  readonly onReadSeries: (seriesId: string) => void;
};

// SeriesDetailsState stores the local aggregate shown by the screen.
type SeriesDetailsState = {
  // series is the selected local story container.
  readonly series: Series;
  // episodes are saved local generated units.
  readonly episodes: readonly Episode[];
  // memory is compact continuity state when present.
  readonly memory?: SeriesMemory;
};

// SeriesDetailsScreen shows one series, its memory, and completed episodes.
export function SeriesDetailsScreen({
  onBack,
  onOpenEpisode,
  onPrepareEpisode,
  onReadSeries,
  seriesId,
  styles,
}: SeriesDetailsScreenProps): ReactElement {
  const [state, setState] = useState<SeriesDetailsState>();
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadDetails = useCallback(async (): Promise<void> => {
    try {
      const details = await localAppServices.loadSeriesDetails.execute({ seriesId });

      setState(details);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Series details could not be loaded.');
    }
  }, [seriesId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const requestDeleteEpisode = (episode: Episode): void => {
    Alert.alert(
      'Delete episode?',
      `This removes Episode ${episode.orderIndex} from local history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteEpisode(episode.id);
          },
        },
      ],
    );
  };

  const deleteEpisode = async (episodeId: string): Promise<void> => {
    setDeletingEpisodeId(episodeId);
    setErrorMessage(undefined);

    try {
      await localAppServices.deleteEpisode.execute({ episodeId });
      await loadDetails();
    } catch {
      setErrorMessage('Episode could not be deleted.');
    } finally {
      setDeletingEpisodeId(undefined);
    }
  };

  if (errorMessage) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.homeHeader}>
          <Pressable onPress={onBack} style={styles.smallPrimaryButton}>
            <Text style={styles.smallPrimaryButtonText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>Loading series...</Text>
        </View>
      </View>
    );
  }

  const latestEpisode = state.episodes.at(-1);
  const hasEpisodeInProgress =
    latestEpisode !== undefined && !latestEpisode.isComplete;
  const nextEpisodeNumber = state.episodes.length + 1;

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Pressable onPress={onBack} style={styles.smallPrimaryButton}>
          <Text style={styles.smallPrimaryButtonText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.seriesDetailsHeader}>
        <Text style={styles.readerBadge}>{state.series.genre}</Text>
        <Text style={styles.largeTitle}>{state.series.title}</Text>
        <Text style={styles.secondaryText}>{state.series.premise}</Text>
      </View>

      <Pressable
        onPress={() => {
          if (latestEpisode && !latestEpisode.isComplete) {
            onOpenEpisode(latestEpisode.id);

            return;
          }

          onPrepareEpisode(state.series.id);
        }}
        style={({ pressed }) => [
          styles.continueBanner,
          styles.seriesPrepareBanner,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.continueTag}>
          {hasEpisodeInProgress ? 'CONTINUE EPISODE' : 'PREPARE NEXT'}
        </Text>
        <Text style={styles.continueTitle}>
          Episode{' '}
          {hasEpisodeInProgress
            ? (latestEpisode?.orderIndex ?? nextEpisodeNumber)
            : nextEpisodeNumber}
        </Text>
        <Text style={styles.continueText}>
          {hasEpisodeInProgress
            ? 'Return to the latest decision and finish this episode arc.'
            : 'Choose Story Words and generate the next AI episode.'}
        </Text>
        <Text style={styles.bannerButtonText}>
          {hasEpisodeInProgress ? 'Continue Reading' : 'Start Setup'}
        </Text>
      </Pressable>

      <View style={styles.settingsCard}>
        <Text style={styles.actionTitle}>Series Memory</Text>
        <Text style={styles.secondaryText}>
          {state.memory?.lastEpisodeSummary ??
            state.memory?.unresolvedCliffhanger ??
            'No generated episode memory yet.'}
        </Text>
      </View>

      {state.episodes.length > 0 ? (
        <Pressable
          onPress={() => onReadSeries(state.series.id)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Read Full Series</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionLabel}>EPISODE HISTORY</Text>
      {state.episodes.length === 0 ? (
        <View style={styles.emptySeriesPanel}>
          <Text style={styles.actionTitle}>No episodes yet</Text>
          <Text style={styles.secondaryText}>
            Generate the first episode to create local history.
          </Text>
        </View>
      ) : (
        <View style={styles.seriesList}>
          {state.episodes.map((episode) => (
            <EpisodeHistoryRow
              isDeleting={episode.id === deletingEpisodeId}
              episode={episode}
              key={episode.id}
              styles={styles}
              onDeleteEpisode={requestDeleteEpisode}
              onOpenEpisode={onOpenEpisode}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// EpisodeHistoryRow opens one completed local episode in read/listen mode.
function EpisodeHistoryRow({
  episode,
  isDeleting,
  styles,
  onDeleteEpisode,
  onOpenEpisode,
}: {
  // episode is a locally saved generated unit.
  readonly episode: Episode;
  // isDeleting prevents duplicate destructive writes for this row.
  readonly isDeleting: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onDeleteEpisode triggers a confirmation before local deletion.
  readonly onDeleteEpisode: (episode: Episode) => void;
  // onOpenEpisode opens this saved episode in the reader.
  readonly onOpenEpisode: (episodeId: string) => void;
}): ReactElement {
  return (
    <View style={styles.seriesRow}>
      <View style={styles.flex}>
        <Pressable
          onPress={() => onOpenEpisode(episode.id)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={styles.actionTitle}>
            Episode {episode.orderIndex}: {episode.title ?? 'Untitled'}
          </Text>
          <Text style={styles.secondaryText} numberOfLines={2}>
            {episode.summaryUpdate}
          </Text>
          <Text style={styles.sectionLabel}>
            {episode.isComplete
              ? `${episode.interactions.length} DECISIONS - COMPLETE`
              : `${episode.interactions.length} DECISIONS - IN PROGRESS`}
          </Text>
        </Pressable>
      </View>
      <View style={styles.rowActionStack}>
        <Pressable
          onPress={() => onOpenEpisode(episode.id)}
          style={({ pressed }) => [styles.smallPrimaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.smallPrimaryButtonText}>Read</Text>
        </Pressable>
        <Pressable
          disabled={isDeleting}
          onPress={() => onDeleteEpisode(episode)}
          style={({ pressed }) => [
            styles.destructiveIconButton,
            pressed && styles.pressed,
            isDeleting && styles.disabledControl,
          ]}
        >
          <Text style={styles.destructiveIconText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
