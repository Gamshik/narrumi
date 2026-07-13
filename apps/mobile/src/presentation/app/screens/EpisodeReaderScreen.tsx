import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { darkColors, lightColors } from '@presentation/theme';

import { BackIconButton, JellyPressable } from '../shared';
import { useAppTheme } from '../theme';

import type {
  Episode,
  EpisodeSentenceFrame,
  EpisodeInteraction,
  TranslationAnnotation,
} from '@domain/index';

import { localAppServices } from '../services/localAppServices';
import type { AppStyles } from '../types';
import {
  EpisodeSentence,
  TranslationSheet,
} from './episodeReader/components';
import type { SpeakerThemeName } from './episodeReader/components/EpisodeSentence/EpisodeSentence';
import { SupabaseFunctionError } from '@infrastructure/supabase/supabaseFunctionError';

// SPEAKER_THEME_ORDER assigns distinct dialogue accents by first encounter.
const SPEAKER_THEME_ORDER: readonly SpeakerThemeName[] = [
  'blue',
  'orange',
  'purple',
  'pink',
  'teal',
] as const;

// CONTINUATION_MINIMUM_LATENCY_MS keeps the inline shimmer visible during fast responses.
const CONTINUATION_MINIMUM_LATENCY_MS = 1500;

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
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const [episodes, setEpisodes] = useState<readonly Episode[]>([]);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [interactionErrorMessage, setInteractionErrorMessage] =
    useState<string>();
  const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<TranslationAnnotation>();
  const scrollViewRef = useRef<ScrollView>(null);

  const activeEpisode = episodes[activeEpisodeIndex];
  // backButton keeps reader navigation identical across loading, error, and content states.
  const backButton: ReactElement | null = onExit ? (
    <BackIconButton
      accessibilityHint="Returns to the series screen"
      accessibilityLabel="Back to series"
      colors={colors}
      onPress={onExit}
    />
  ) : null;

  const loadReader = useCallback(async (): Promise<void> => {
    try {
      if (episodeId) {
        const result = await localAppServices.loadEpisodeReader.execute({
          episodeId,
        });

        setEpisodes([result.episode]);
        setActiveEpisodeIndex(0);
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
          setErrorMessage(undefined);

          return;
        }
      }

      throw new Error('Reader target was not found.');
    } catch {
      setErrorMessage('Series reader could not load local episodes.');
    }
  }, [episodeId, seriesId]);

  useEffect(() => {
    void loadReader();
  }, [loadReader]);

  const submitChoice = async (
    targetEpisodeIndex: number,
    interactionId: string,
    choiceId: string,
  ): Promise<void> => {
    // Answer the episode that owns the tapped interaction, not a fixed active
    // index — in "Read Full Series" all episodes are loaded and the pending
    // turn lives in the last one. An unfinished episode stays answerable so an
    // interrupted series can resume from any reader entry point.
    const targetEpisode = episodes[targetEpisodeIndex];

    if (!targetEpisode || targetEpisode.isComplete) {
      return;
    }

    const selectedChoice = targetEpisode.interactions
      .find((interaction) => interaction.id === interactionId)
      ?.choices.find((choice) => choice.id === choiceId);
    const submittedText = cleanSelectedReply(selectedChoice?.label);
    const startedAt = Date.now();

    setIsSubmittingInteraction(true);
    setEpisodes((currentEpisodes) =>
      applyOptimisticChoice({
        activeEpisodeIndex: targetEpisodeIndex,
        choiceId,
        currentEpisodes,
        interactionId,
        submittedText,
      }),
    );
    requestScrollToEnd();

    try {
      const result = await localAppServices.submitEpisodeInteraction.execute({
        choiceId,
        episodeId: targetEpisode.id,
        interactionId,
      });
      await waitForRemainingLatency(startedAt);
      const updatedEpisodes = episodes.map((episode, episodeIndex) =>
        episodeIndex === targetEpisodeIndex ? result.episode : episode,
      );

      setEpisodes(updatedEpisodes);
      setInteractionErrorMessage(undefined);
      requestScrollToEnd();
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
        {backButton}
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>{errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (!activeEpisode) {
    return (
      <View style={styles.screenContent}>
        {backButton}
        <View style={styles.stateMessage}>
          <Text style={styles.stateMessageTitle}>Loading series...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.readerContent}
        ref={scrollViewRef}
      >
        <View style={styles.readerHeader}>
          {backButton}
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
          const isLastEpisode = episodeIndex === episodes.length - 1;
          const pendingInteraction = [...episode.interactions]
            .reverse()
            .find((interaction) => interaction.feedback === undefined);
          const renderedFrames = buildReaderSentenceFrames(
            episode.sentenceFrames,
          );
          const speakerThemes = buildSpeakerThemes(renderedFrames);

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
                {episode.sentences.map((_sentence, sentenceIndex) => {
                  const sentenceEndIndex = sentenceIndex + 1;
                  const interactionsAtBoundary = episode.interactions.filter(
                    (interaction) =>
                      interaction.sentenceEndIndex === sentenceEndIndex,
                  );
                  const sentenceFrame =
                    renderedFrames[sentenceIndex] ??
                    episode.sentenceFrames[sentenceIndex]!;
                  const speakerThemeName =
                    sentenceFrame.kind === 'dialogue'
                      ? speakerThemes.get(
                          normalizeSpeakerName(sentenceFrame.speaker),
                        )
                      : undefined;

                  return (
                    <View key={`${episode.id}:${sentenceIndex}`}>
                      <EpisodeSentence
                        annotations={episode.annotations}
                        isActive={false}
                        isDimmed={false}
                        sentenceFrame={sentenceFrame}
                        sentenceIndex={sentenceIndex}
                        {...(speakerThemeName ? { speakerThemeName } : {})}
                        styles={styles}
                        onPressAnnotation={setSelectedAnnotation}
                        onSelectSentence={() => undefined}
                      />
                      {interactionsAtBoundary.map((interaction) => (
                        <EpisodeInteractionBlock
                          canAnswer={
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
                            void submitChoice(
                              episodeIndex,
                              interaction.id,
                              choiceId,
                            );
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

      </ScrollView>

      <TranslationSheet
        annotation={selectedAnnotation}
        styles={styles}
        onClose={() => setSelectedAnnotation(undefined)}
      />
    </>
  );

  // requestScrollToEnd schedules scroll after React Native applies the new row.
  function requestScrollToEnd(): void {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }
}

// ReaderSentenceFrame stores the display-safe frame after speaker inheritance.
type ReaderSentenceFrame = EpisodeSentenceFrame;

// buildReaderSentenceFrames applies speaker inheritance for underspecified dialogue.
function buildReaderSentenceFrames(
  frames: readonly EpisodeSentenceFrame[],
): readonly ReaderSentenceFrame[] {
  let lastSpeaker: string | undefined;

  return frames.map((frame) => {
    if (frame.kind === 'narration') {
      return frame;
    }

    const speaker = shouldInheritSpeaker(frame.speaker)
      ? lastSpeaker ?? frame.speaker
      : frame.speaker;

    lastSpeaker = speaker;

    return {
      ...frame,
      speaker,
    };
  });
}

// buildSpeakerThemes assigns each encountered speaker a stable visual accent.
function buildSpeakerThemes(
  frames: readonly ReaderSentenceFrame[],
): ReadonlyMap<string, SpeakerThemeName> {
  const themes = new Map<string, SpeakerThemeName>();

  frames.forEach((frame) => {
    if (frame.kind !== 'dialogue') {
      return;
    }

    const speakerKey = normalizeSpeakerName(frame.speaker);

    if (themes.has(speakerKey)) {
      return;
    }

    const themeName =
      SPEAKER_THEME_ORDER[themes.size % SPEAKER_THEME_ORDER.length] ?? 'blue';

    themes.set(speakerKey, themeName);
  });

  return themes;
}

// shouldInheritSpeaker treats generic speaker labels as missing speaker metadata.
function shouldInheritSpeaker(speaker: string): boolean {
  return /^(speaker|unknown|stranger|voice)$/i.test(speaker.trim());
}

// normalizeSpeakerName makes speaker matching resilient to casing and spacing.
function normalizeSpeakerName(speaker: string): string {
  return speaker.trim().toLocaleLowerCase();
}

// cleanSelectedReply removes quote marks that should not appear in answer bubbles.
function cleanSelectedReply(reply: string | undefined): string {
  return reply?.replace(/["“”]/g, '').trim() ?? '';
}

// waitForRemainingLatency keeps the compact shimmer from flashing too quickly.
async function waitForRemainingLatency(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = CONTINUATION_MINIMUM_LATENCY_MS - elapsed;

  if (remaining <= 0) {
    return;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

// applyOptimisticChoice inserts the learner answer before the network response.
function applyOptimisticChoice({
  activeEpisodeIndex,
  choiceId,
  currentEpisodes,
  interactionId,
  submittedText,
}: {
  // activeEpisodeIndex identifies the locally visible episode to update.
  readonly activeEpisodeIndex: number;
  // choiceId stores the chosen option while continuation is pending.
  readonly choiceId: string;
  // currentEpisodes is the current immutable reader state.
  readonly currentEpisodes: readonly Episode[];
  // interactionId identifies the active turn being answered.
  readonly interactionId: string;
  // submittedText is the visible answer after quote stripping.
  readonly submittedText: string;
}): readonly Episode[] {
  return currentEpisodes.map((episode, episodeIndex) => {
    if (episodeIndex !== activeEpisodeIndex) {
      return episode;
    }

    return {
      ...episode,
      interactions: episode.interactions.map((interaction) =>
        interaction.id === interactionId
          ? {
              ...interaction,
              selectedChoiceId: choiceId,
              ...(submittedText ? { userReply: submittedText } : {}),
            }
          : interaction,
      ),
    };
  });
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
          isGenerating={false}
          savedChoiceLabel={savedChoice?.label}
          styles={styles}
        />
      </View>
    );
  }

  if (hasSavedAnswer) {
    return (
      <View style={styles.readerInteraction}>
        <SavedEpisodeAnswer
          interaction={interaction}
          isGenerating={isSubmitting}
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
            <JellyPressable
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
            </JellyPressable>
          );
        })}
      </View>
    </>
  );
}

// SavedEpisodeAnswer renders one persisted answer and its language feedback.
function SavedEpisodeAnswer({
  interaction,
  isGenerating,
  savedChoiceLabel,
  styles,
}: {
  // interaction contains the persisted learner answer and feedback.
  readonly interaction: EpisodeInteraction;
  // isGenerating shows the inline continuation skeleton below the saved answer.
  readonly isGenerating: boolean;
  // savedChoiceLabel resolves the selected choice id for display.
  readonly savedChoiceLabel: string | undefined;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  const answer = interaction.userReply ?? savedChoiceLabel;
  const savedChoice = interaction.choices.find(
    (choice) => choice.id === interaction.selectedChoiceId,
  );
  const isSpeechAnswer = savedChoice?.isSpeech !== false;

  return (
    <>
      <Text style={styles.sectionLabel}>YOUR ANSWER</Text>
      {isSpeechAnswer ? (
        <View style={styles.readerSavedAnswer}>
          <Text style={styles.readerSavedAnswerText}>
            {cleanSelectedReply(answer) || 'No answer was saved.'}
          </Text>
        </View>
      ) : (
        <View style={styles.readerNarrativeAnswer}>
          <Text style={styles.readerNarrativeAnswerText}>
            You decided to: {cleanSelectedReply(answer) || 'No action was saved.'}
          </Text>
        </View>
      )}
      {isGenerating ? <InlineGenerationShimmer styles={styles} /> : null}
      {interaction.feedback ? (
        <View style={styles.readerFeedback}>
          <Text style={styles.sectionLabel}>FEEDBACK</Text>
          <Text style={styles.secondaryText}>{interaction.feedback}</Text>
        </View>
      ) : null}
    </>
  );
}

// InlineGenerationShimmer previews feedback and continuation while online AI resolves.
function InlineGenerationShimmer({
  styles,
}: {
  // styles is the shared themed StyleSheet contract.
  readonly styles: AppStyles;
}): ReactElement {
  return (
    <View style={styles.readerGenerationShimmer}>
      <View style={styles.readerShimmerCard}>
        <View style={[styles.readerShimmerLine, { width: 104 }]} />
        <View style={[styles.readerShimmerLine, { width: '92%' }]} />
        <View style={[styles.readerShimmerLine, { width: '70%' }]} />
      </View>
      <View style={styles.readerShimmerRow}>
        <View style={styles.readerShimmerAvatar} />
        <View style={styles.readerShimmerBubbleWrapper}>
          <View style={[styles.readerShimmerLine, { width: 74 }]} />
          <View style={styles.readerShimmerBubble} />
        </View>
      </View>
      <View style={styles.readerShimmerNarrative} />
    </View>
  );
}
