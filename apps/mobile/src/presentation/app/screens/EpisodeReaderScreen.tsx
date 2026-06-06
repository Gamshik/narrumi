import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Episode, TranslationAnnotation } from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  AudioControls,
  EpisodeSentence,
  TranslationSheet,
} from './episodeReader/components';

// EpisodeReaderScreenProps carries route input and series reader behavior.
type EpisodeReaderScreenProps = {
  // episodeId optionally selects one episode after the series list is loaded.
  readonly episodeId?: string;
  // seriesId loads the complete locally persisted episode sequence.
  readonly seriesId?: string;
  // isReadOnly prevents completed history from changing saved story outcomes.
  readonly isReadOnly?: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onExit returns to the owning series or stories list.
  readonly onExit?: () => void;
};

// EpisodeReaderScreen renders one complete series timeline and active narration.
export function EpisodeReaderScreen({
  episodeId,
  isReadOnly = false,
  onExit,
  seriesId,
  styles,
}: EpisodeReaderScreenProps): ReactElement {
  const [episodes, setEpisodes] = useState<readonly Episode[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [interactionErrorMessage, setInteractionErrorMessage] =
    useState<string>();
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<TranslationAnnotation>();

  const activeEpisode = episodes[activeEpisodeIndex];

  const loadReader = useCallback(async (): Promise<void> => {
    try {
      if (seriesId) {
        const details = await localAppServices.loadSeriesDetails.execute({ seriesId });

        if (details.episodes.length > 0) {
          const selectedIndex = episodeId
            ? details.episodes.findIndex((episode) => episode.id === episodeId)
            : details.episodes.length - 1;

          setEpisodes(details.episodes);
          setActiveEpisodeIndex(
            selectedIndex >= 0 ? selectedIndex : details.episodes.length - 1,
          );
          setCurrentSentenceIndex(0);
          setErrorMessage(undefined);

          return;
        }
      }

      const result = await localAppServices.loadEpisodeReader.execute({
        ...(episodeId ? { episodeId } : {}),
      });

      setEpisodes([result.episode]);
      setActiveEpisodeIndex(0);
      setCurrentSentenceIndex(0);
      setErrorMessage(undefined);
    } catch {
      setErrorMessage('Series reader could not load local episodes.');
    }
  }, [episodeId, seriesId]);

  const pauseNarration = useCallback(async (): Promise<void> => {
    await localAppServices.audioNarrator.pause();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    void loadReader();
  }, [loadReader]);

  useEffect(() => {
    const sentence = activeEpisode?.sentences[currentSentenceIndex];

    if (!isPlaying || !activeEpisode || sentence === undefined) {
      return undefined;
    }

    void localAppServices.audioNarrator.speak({
      sentence,
      sentenceIndex: currentSentenceIndex,
      onDone: (completedIndex) => {
        const nextSentenceIndex = completedIndex + 1;

        if (nextSentenceIndex < activeEpisode.sentences.length) {
          setCurrentSentenceIndex(nextSentenceIndex);

          return;
        }

        const nextEpisodeIndex = activeEpisodeIndex + 1;

        if (nextEpisodeIndex < episodes.length) {
          setActiveEpisodeIndex(nextEpisodeIndex);
          setCurrentSentenceIndex(0);
        } else {
          setIsPlaying(false);
        }
      },
    });

    return () => {
      void localAppServices.audioNarrator.pause();
    };
  }, [
    activeEpisode,
    activeEpisodeIndex,
    currentSentenceIndex,
    episodes.length,
    isPlaying,
  ]);

  const togglePlayback = async (): Promise<void> => {
    if (isPlaying) {
      await pauseNarration();

      return;
    }

    setIsPlaying(true);
  };

  const selectSentence = async (
    episodeIndex: number,
    sentenceIndex: number,
  ): Promise<void> => {
    await localAppServices.audioNarrator.pause();
    setActiveEpisodeIndex(episodeIndex);
    setCurrentSentenceIndex(sentenceIndex);
  };

  const submitChoice = async (choiceId: string): Promise<void> => {
    const hasSavedInteraction =
      activeEpisode?.interaction.selectedChoiceId !== undefined ||
      activeEpisode?.interaction.userReply !== undefined;

    if (
      !activeEpisode ||
      isReadOnly ||
      hasSavedInteraction
    ) {
      return;
    }

    setIsSubmittingInteraction(true);
    await pauseNarration();

    try {
      const result = await localAppServices.submitEpisodeInteraction.execute({
        choiceId,
        episodeId: activeEpisode.id,
      });
      const updatedEpisodes = episodes.map((episode, episodeIndex) =>
        episodeIndex === activeEpisodeIndex ? result.episode : episode,
      );

      setEpisodes(updatedEpisodes);
      setInteractionErrorMessage(undefined);
    } catch (error) {
      console.error('submitChoice error:', error);
      setInteractionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Story interaction is online-only and requires configured Supabase Edge Functions.',
      );
    } finally {
      setIsSubmittingInteraction(false);
    }
  };

  if (errorMessage) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!activeEpisode) {
    return (
      <View style={styles.screenContent}>
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>Loading series...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.readerContent}>
        <View style={styles.readerHeader}>
          <View style={styles.flex}>
            <Text style={styles.appCategory}>SERIES READER</Text>
            <Text style={styles.largeTitle}>
              {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
            </Text>
          </View>
          <Text style={styles.readerBadge}>AI</Text>
        </View>

        {interactionErrorMessage ? (
          <View style={styles.stateMessage}>
            <Text style={styles.stateMessageTitle}>
              {interactionErrorMessage}
            </Text>
          </View>
        ) : null}

        {episodes.map((episode, episodeIndex) => {
          const isActiveEpisode = episodeIndex === activeEpisodeIndex;
          const isLastEpisode = episodeIndex === episodes.length - 1;
          const savedChoice = episode.interaction.choices.find(
            (choice) => choice.id === episode.interaction.selectedChoiceId,
          );
          const hasSavedAnswer =
            savedChoice !== undefined || episode.interaction.userReply !== undefined;
          const canAnswer =
            !isReadOnly && isLastEpisode && !hasSavedAnswer;

          return (
            <View key={episode.id} style={styles.readerEpisodeBlock}>
              <View style={styles.readerEpisodeHeading}>
                <Text style={styles.sectionLabel}>
                  EPISODE {episode.orderIndex}
                </Text>
                <Text style={styles.actionTitle}>
                  {episode.title ?? 'Untitled Episode'}
                </Text>
                {episode.previouslyRecap ? (
                  <Text style={styles.secondaryText}>{episode.previouslyRecap}</Text>
                ) : null}
              </View>

              <View style={styles.readerStory}>
                {episode.sentences.map((sentence, sentenceIndex) => (
                  <EpisodeSentence
                    annotations={episode.annotations}
                    isActive={
                      isActiveEpisode && sentenceIndex === currentSentenceIndex
                    }
                    isDimmed={
                      isActiveEpisode && sentenceIndex !== currentSentenceIndex
                    }
                    key={`${episode.id}:${sentenceIndex}`}
                    sentence={sentence}
                    sentenceIndex={sentenceIndex}
                    styles={styles}
                    onPressAnnotation={setSelectedAnnotation}
                    onSelectSentence={(nextSentenceIndex) => {
                      void selectSentence(episodeIndex, nextSentenceIndex);
                    }}
                  />
                ))}
              </View>

              <View style={styles.readerInteraction}>
                {hasSavedAnswer || isReadOnly ? (
                  <SavedEpisodeAnswer
                    episode={episode}
                    savedChoiceLabel={savedChoice?.label}
                    styles={styles}
                  />
                ) : canAnswer ? (
                  <EpisodeChoice
                    episode={episode}
                    isSubmitting={isSubmittingInteraction}
                    styles={styles}
                    onSelectChoice={(choiceId) => {
                      void submitChoice(choiceId);
                    }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}

        {onExit ? (
          <Pressable
            onPress={onExit}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Back to Series</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <AudioControls
        currentSentenceIndex={currentSentenceIndex}
        isPlaying={isPlaying}
        sentenceCount={activeEpisode.sentences.length}
        styles={styles}
        onPlayPause={() => {
          void togglePlayback();
        }}
      />
      <TranslationSheet
        annotation={selectedAnnotation}
        styles={styles}
        onClose={() => setSelectedAnnotation(undefined)}
      />
    </>
  );
}

// EpisodeChoice renders the only interactive answer point in the current series.
function EpisodeChoice({
  episode,
  isSubmitting,
  styles,
  onSelectChoice,
}: {
  // episode is the current unanswered story unit.
  readonly episode: Episode;
  // isSubmitting disables duplicate local writes.
  readonly isSubmitting: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectChoice persists one learner-controlled outcome.
  readonly onSelectChoice: (choiceId: string) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>STORY CHOICE</Text>
      <Text style={styles.actionTitle}>{episode.interaction.prompt}</Text>
      <View style={styles.choiceRow}>
        {episode.interaction.choices.map((choice) => (
          <Pressable
            disabled={isSubmitting}
            key={choice.id}
            onPress={() => onSelectChoice(choice.id)}
            style={({ pressed }) => [
              styles.readerChoice,
              isSubmitting && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.readerChoiceText}>{choice.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

// SavedEpisodeAnswer renders persisted learner input without interactive choices.
function SavedEpisodeAnswer({
  episode,
  savedChoiceLabel,
  styles,
}: {
  // episode contains the persisted interaction answer and feedback.
  readonly episode: Episode;
  // savedChoiceLabel resolves the selected choice id for display.
  readonly savedChoiceLabel: string | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  const answer = episode.interaction.userReply ?? savedChoiceLabel;

  return (
    <>
      <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
      <View style={styles.readerSavedAnswer}>
        <Text style={styles.actionTitle}>{answer ?? 'No answer was saved.'}</Text>
      </View>
      {episode.interaction.feedback ? (
        <View style={styles.readerFeedback}>
          <Text style={styles.sectionLabel}>FEEDBACK</Text>
          <Text style={styles.secondaryText}>{episode.interaction.feedback}</Text>
        </View>
      ) : null}
    </>
  );
}
