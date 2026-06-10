import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import type {
  Episode,
  EpisodeInteraction,
  TranslationAnnotation,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  AudioControls,
  EpisodeSentence,
  TranslationSheet,
} from './episodeReader/components';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// EpisodeReaderScreenProps carries route input and series reader behavior.
type EpisodeReaderScreenProps = {
  // episodeId loads only the selected episode when present.
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

// EpisodeReaderScreen renders saved story beats and decisions in episode order.
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
      if (episodeId) {
        const result = await localAppServices.loadEpisodeReader.execute({
          episodeId,
        });

        setEpisodes([result.episode]);
        setActiveEpisodeIndex(0);
        setCurrentSentenceIndex(0);
        setErrorMessage(undefined);

        return;
      }

      if (seriesId) {
        const details = await localAppServices.loadSeriesDetails.execute({
          seriesId,
        });

        if (details.episodes.length > 0) {
          setEpisodes(details.episodes);
          setActiveEpisodeIndex(0);
          setCurrentSentenceIndex(0);
          setErrorMessage(undefined);

          return;
        }
      }

      throw new Error('Reader target was not found.');
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

  const submitChoice = async (
    interactionId: string,
    choiceId: string,
  ): Promise<void> => {
    if (!activeEpisode || isReadOnly || activeEpisode.isComplete) {
      return;
    }

    const previousSentenceCount = activeEpisode.sentences.length;

    setIsSubmittingInteraction(true);
    await pauseNarration();

    try {
      const result = await localAppServices.submitEpisodeInteraction.execute({
        choiceId,
        episodeId: activeEpisode.id,
        interactionId,
      });
      const updatedEpisodes = episodes.map((episode, episodeIndex) =>
        episodeIndex === activeEpisodeIndex ? result.episode : episode,
      );

      setEpisodes(updatedEpisodes);
      setCurrentSentenceIndex(
        previousSentenceCount < result.episode.sentences.length
          ? previousSentenceCount
          : 0,
      );
      setInteractionErrorMessage(undefined);
    } catch (error) {
      const isModerationError =
        error instanceof SupabaseFunctionError &&
        (error.kind === 'moderation_warning' ||
          error.kind === 'moderation_banned');
      const message =
        error instanceof Error
          ? error.message
          : 'Story interaction is online-only and requires configured Supabase Edge Functions.';

      if (isModerationError) {
        Alert.alert(
          error.kind === 'moderation_banned'
            ? 'You are banned'
            : 'Warning',
          message,
        );
        return;
      }

      console.error('submitChoice error:', error);
      Alert.alert('Story interaction stopped', message);
      setInteractionErrorMessage(message);
      // The answer is persisted before the network call, so reload its draft state.
      await loadReader();
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
          const pendingInteraction = [...episode.interactions]
            .reverse()
            .find((interaction) => interaction.feedback === undefined);

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
                  <Text style={styles.secondaryText}>
                    {episode.previouslyRecap}
                  </Text>
                ) : null}
              </View>

              <View style={styles.readerStory}>
                {episode.sentences.map((sentence, sentenceIndex) => {
                  const sentenceEndIndex = sentenceIndex + 1;
                  const interactionsAtBoundary = episode.interactions.filter(
                    (interaction) =>
                      interaction.sentenceEndIndex === sentenceEndIndex,
                  );

                  return (
                    <View key={`${episode.id}:${sentenceIndex}`}>
                      <EpisodeSentence
                        annotations={episode.annotations}
                        isActive={
                          isActiveEpisode &&
                          sentenceIndex === currentSentenceIndex
                        }
                        isDimmed={
                          isActiveEpisode &&
                          sentenceIndex !== currentSentenceIndex
                        }
                        sentenceFrame={episode.sentenceFrames[sentenceIndex]!}
                        sentenceIndex={sentenceIndex}
                        styles={styles}
                        onPressAnnotation={setSelectedAnnotation}
                        onSelectSentence={(nextSentenceIndex) => {
                          void selectSentence(episodeIndex, nextSentenceIndex);
                        }}
                      />
                      {interactionsAtBoundary.map((interaction) => (
                        <EpisodeInteractionBlock
                          canAnswer={
                            !isReadOnly &&
                            isLastEpisode &&
                            !episode.isComplete &&
                            pendingInteraction?.id === interaction.id
                          }
                          interaction={interaction}
                          isReadOnly={isReadOnly}
                          isSubmitting={isSubmittingInteraction}
                          key={interaction.id}
                          styles={styles}
                          onSelectChoice={(choiceId) => {
                            void submitChoice(interaction.id, choiceId);
                          }}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>

              {episode.isComplete ? (
                <View style={styles.readerComplete}>
                  <Text style={styles.sectionLabel}>EPISODE COMPLETE</Text>
                  <Text style={styles.secondaryText}>
                    {episode.cliffhanger ??
                      'This episode is complete. The series can continue.'}
                  </Text>
                </View>
              ) : null}
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

// EpisodeInteractionBlock chooses read-only, answered, or active interaction UI.
function EpisodeInteractionBlock({
  canAnswer,
  interaction,
  isReadOnly,
  isSubmitting,
  onSelectChoice,
  styles,
}: {
  // canAnswer permits only the latest pending turn in the current episode.
  readonly canAnswer: boolean;
  // interaction is one ordered decision inside the episode timeline.
  readonly interaction: EpisodeInteraction;
  // isReadOnly prevents historical episodes from becoming interactive.
  readonly isReadOnly: boolean;
  // isSubmitting disables duplicate network requests.
  readonly isSubmitting: boolean;
  // onSelectChoice submits the selected controlled outcome.
  readonly onSelectChoice: (choiceId: string) => void;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement | null {
  const savedChoice = interaction.choices.find(
    (choice) => choice.id === interaction.selectedChoiceId,
  );
  const hasSavedAnswer =
    savedChoice !== undefined || interaction.userReply !== undefined;

  if (interaction.feedback !== undefined || (isReadOnly && hasSavedAnswer)) {
    return (
      <View style={styles.readerInteraction}>
        <SavedEpisodeAnswer
          interaction={interaction}
          savedChoiceLabel={savedChoice?.label}
          styles={styles}
        />
      </View>
    );
  }

  if (canAnswer) {
    return (
      <View style={styles.readerInteraction}>
        <EpisodeChoice
          interaction={interaction}
          isSubmitting={isSubmitting}
          styles={styles}
          onSelectChoice={onSelectChoice}
        />
      </View>
    );
  }

  if (hasSavedAnswer) {
    return (
      <View style={styles.readerInteraction}>
        <SavedEpisodeAnswer
          interaction={interaction}
          savedChoiceLabel={savedChoice?.label}
          styles={styles}
        />
      </View>
    );
  }

  return null;
}

// EpisodeChoice renders the active controlled decision inside the episode.
function EpisodeChoice({
  interaction,
  isSubmitting,
  styles,
  onSelectChoice,
}: {
  // interaction is the current unanswered story turn.
  readonly interaction: EpisodeInteraction;
  // isSubmitting disables duplicate local and remote writes.
  readonly isSubmitting: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
  // onSelectChoice persists one learner-controlled outcome.
  readonly onSelectChoice: (choiceId: string) => void;
}): ReactElement {
  return (
    <>
      <Text style={styles.sectionLabel}>STORY CHOICE</Text>
      <Text style={styles.actionTitle}>{interaction.prompt}</Text>
      <View style={styles.choiceRow}>
        {interaction.choices.map((choice) => {
          const isSelected = interaction.selectedChoiceId === choice.id;

          return (
            <Pressable
              disabled={isSubmitting}
              key={choice.id}
              onPress={() => onSelectChoice(choice.id)}
              style={({ pressed }) => [
                styles.readerChoice,
                isSelected && styles.readerChoiceSelected,
                isSubmitting && styles.disabledControl,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.readerChoiceText}>
                {isSubmitting && isSelected ? 'Continuing...' : choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// SavedEpisodeAnswer renders one persisted answer and its language feedback.
function SavedEpisodeAnswer({
  interaction,
  savedChoiceLabel,
  styles,
}: {
  // interaction contains the persisted learner answer and feedback.
  readonly interaction: EpisodeInteraction;
  // savedChoiceLabel resolves the selected choice id for display.
  readonly savedChoiceLabel: string | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  const answer = interaction.userReply ?? savedChoiceLabel;

  return (
    <>
      <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
      <View style={styles.readerSavedAnswer}>
        <Text style={styles.actionTitle}>{answer ?? 'No answer was saved.'}</Text>
      </View>
      {interaction.feedback ? (
        <View style={styles.readerFeedback}>
          <Text style={styles.sectionLabel}>FEEDBACK</Text>
          <Text style={styles.secondaryText}>{interaction.feedback}</Text>
        </View>
      ) : null}
    </>
  );
}
