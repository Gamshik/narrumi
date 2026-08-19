import {
  buildAiStoryWord,
  buildCompactSeriesMemoryPayload,
  type InteractionGatewayPayload,
  SAFETY_AND_COPYRIGHT_CONSTRAINTS,
} from '@application/ai/episodeAiPayload';
import type {
  Clock,
  ConnectivityState,
  InteractionGateway,
  LocalSeriesStore,
  NetworkStatus,
  VocabularyCatalog,
} from '@application/ports';
import type {
  Episode,
  EpisodeInteraction,
  FreeReplyIntent,
  LearningSignal,
  SyncMetadata,
  VocabularyItem,
} from '@domain/index';

import { applyMemoryUpdate } from './generateEpisode';

// PREVIOUS_DECISION_CONTEXT_LIMIT keeps one episode request bounded for Edge Functions.
const PREVIOUS_DECISION_CONTEXT_LIMIT = 10;

// SubmitEpisodeInteractionInput captures one learner answer inside a saved episode.
export type SubmitEpisodeInteractionInput = {
  // episodeId identifies the unanswered local episode.
  readonly episodeId: string;
  // interactionId identifies the exact unanswered turn being submitted.
  readonly interactionId: string;
  // choiceId is used when the episode offers controlled choices.
  readonly choiceId?: string;
  // userReply stores free-form learner text when used.
  readonly userReply?: string;
  // replyIntent disambiguates a free-form answer before it reaches the story boundary.
  readonly replyIntent?: FreeReplyIntent;
};

// SubmitEpisodeInteractionResult returns the updated same episode after persistence.
export type SubmitEpisodeInteractionResult =
  | {
      // status confirms that the submitted answer continued the current episode.
      readonly status: 'continued';
      // episode is the saved record with answer, feedback, and continuation text.
      readonly episode: Episode;
    }
  | {
      // status reports editable input that did not consume the current turn.
      readonly status: 'needs-revision';
      // episode restores the original text as a local draft with guidance.
      readonly episode: Episode;
      // guidance is repeated for immediate UI focus without another local read.
      readonly guidance: NonNullable<EpisodeInteraction['replyGuidance']>;
    };

// SubmitEpisodeInteraction coordinates AI feedback and local-first episode updates.
export type SubmitEpisodeInteraction = {
  // execute saves the learner answer into the same episode after AI validation.
  readonly execute: (
    input: SubmitEpisodeInteractionInput,
  ) => Promise<SubmitEpisodeInteractionResult>;
};

// createSubmitEpisodeInteraction injects storage, connectivity, and AI boundary ports.
export function createSubmitEpisodeInteraction(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  networkStatus: NetworkStatus,
  gateway: InteractionGateway,
  clock: Clock,
): SubmitEpisodeInteraction {
  // inFlightSubmissions lets a remounted reader join the original request instead of duplicating it.
  const inFlightSubmissions: Map<
    string,
    Promise<SubmitEpisodeInteractionResult>
  > = new Map<string, Promise<SubmitEpisodeInteractionResult>>();

  // submitInteraction performs one local-first answer and continuation transaction.
  const submitInteraction: SubmitEpisodeInteraction = {
    execute: async ({
      choiceId,
      episodeId,
      interactionId,
      replyIntent,
      userReply,
    }) => {
      const episode = await store.getEpisode(episodeId);

      if (!episode) {
        throw new Error('Episode is required before submitting an answer.');
      }

      const [series, memory] = await Promise.all([
        store.getSeries(episode.seriesId),
        store.getSeriesMemory(episode.seriesId),
      ]);

      if (!series || !memory) {
        throw new Error('Series context is required before submitting an answer.');
      }

      const targetedInteraction = episode.interactions.find(
        (interaction) => interaction.id === interactionId,
      );

      // A request may finish between reader restoration and retry; reuse that durable result.
      if (targetedInteraction?.feedback !== undefined) {
        return { status: 'continued', episode };
      }

      const activeInteraction = targetedInteraction;

      if (!activeInteraction || episode.isComplete) {
        throw new Error('Episode does not have an active interaction.');
      }

      const lastPendingInteraction = [...episode.interactions]
        .reverse()
        .find((interaction) => interaction.feedback === undefined);

      if (lastPendingInteraction?.id !== activeInteraction.id) {
        throw new Error('Only the latest episode interaction can be answered.');
      }

      // A restored pending answer owns the canonical choice and text for every retry.
      const effectiveChoiceId: string | undefined =
        activeInteraction.selectedChoiceId ?? choiceId;
      const selectedChoice = effectiveChoiceId
        ? activeInteraction.choices.find(
            (choice) => choice.id === effectiveChoiceId,
          )
        : undefined;
      const submittedText: string | undefined =
        activeInteraction.userReply?.trim() ||
        userReply?.replace(/\s+/g, ' ').trim() ||
        selectedChoice?.label;
      const effectiveReplyIntent: FreeReplyIntent | undefined =
        activeInteraction.replyIntent ?? replyIntent;

      if (!submittedText) {
        throw new Error('A story answer is required.');
      }

      if (!selectedChoice) {
        assertReplyIntent(series.participationMode, effectiveReplyIntent);
      }
      const answerFields:
        | {
            readonly selectedChoiceId: string;
            readonly selectedChoiceLabel: string;
          }
        | {
            readonly userReply: string;
            readonly replyIntent: FreeReplyIntent;
          } = selectedChoice && effectiveChoiceId
        ? {
            selectedChoiceId: effectiveChoiceId,
            selectedChoiceLabel: selectedChoice.label,
          }
        : {
            userReply: submittedText,
            replyIntent: effectiveReplyIntent as FreeReplyIntent,
          };

      const timestamp: string = clock.now().toISOString();
      const submissionId: string =
        activeInteraction.submissionId ??
        `submission:${episode.id}:${activeInteraction.id}:${timestamp}`;
      const draftEpisode: Episode = {
        ...episode,
        interactions: episode.interactions.map((interaction) =>
          interaction.id === activeInteraction.id
            ? createPendingInteraction({
                ...(effectiveChoiceId ? { choiceId: effectiveChoiceId } : {}),
                interaction,
                ...(effectiveReplyIntent
                  ? { replyIntent: effectiveReplyIntent }
                  : {}),
                submissionId,
                submittedText,
                timestamp,
              })
            : interaction,
        ),
        updatedAt: timestamp,
        sync: createDirtySync(timestamp, episode.id),
      };

      await store.saveEpisode(draftEpisode);
      // The answer is durable before connectivity is checked, so going offline
      // never discards a tap or a freshly typed response.
      const connectivity: ConnectivityState =
        await networkStatus.getCurrentState();

      if (!connectivity.isOnline) {
        throw new Error('Story interaction is available only when online.');
      }

      // Vocabulary loading can be comparatively expensive; the pending answer must be durable first.
      const vocabulary = await catalog.list();

      let payload: InteractionGatewayPayload;

      try {
        payload = await gateway.submitInteraction({
          submissionId,
          episodeId,
          interactionId: activeInteraction.id,
          seriesId: episode.seriesId,
          seriesTitle: series.title,
          cefrLevel: episode.cefrLevel,
          genre: episode.genre,
          participationMode: series.participationMode,
          compactSeriesMemory: buildCompactSeriesMemoryPayload(memory),
          episodeSummary: episode.summaryUpdate,
          interactionPrompt: activeInteraction.prompt,
          interactionCount: episode.interactions.length,
          previousDecisions: episode.interactions
            .filter((interaction) => interaction.feedback !== undefined)
            .slice(-PREVIOUS_DECISION_CONTEXT_LIMIT)
            .map((interaction) => ({
              prompt: interaction.prompt,
              answer:
                interaction.userReply ??
                interaction.choices.find(
                  (choice) => choice.id === interaction.selectedChoiceId,
                )?.label ??
                'No answer recorded',
              ...(interaction.feedback
                ? { feedback: interaction.feedback }
                : {}),
            })),
          selectedStoryWords: resolveStoryWords({
            vocabulary,
            wordIds: episode.storyWordIds,
          }).map(buildAiStoryWord),
          encounteredStoryWordIds: unique(
            episode.annotations.flatMap((annotation) =>
              annotation.wordId ? [annotation.wordId] : [],
            ),
          ),
          // Controlled labels are AI-authored context. Only free-form text crosses
          // the moderation boundary as a learner-authored userReply.
          ...answerFields,
          safetyAndCopyrightConstraints: SAFETY_AND_COPYRIGHT_CONSTRAINTS,
        });
      } catch (error: unknown) {
        if (!effectiveChoiceId && shouldRestoreDraftAfterError(error)) {
          await store.saveEpisode(
            restoreFreeReplyDraft({
              episode: draftEpisode,
              guidance: undefined,
              interactionId: activeInteraction.id,
              ...(effectiveReplyIntent
                ? { replyIntent: effectiveReplyIntent }
                : {}),
              submittedText,
              timestamp,
            }),
          );
        }

        throw error;
      }

      if (payload.status === 'needs-revision') {
        const revisedEpisode: Episode = restoreFreeReplyDraft({
          episode: draftEpisode,
          guidance: payload.guidance,
          interactionId: activeInteraction.id,
          ...(effectiveReplyIntent
            ? { replyIntent: effectiveReplyIntent }
            : {}),
          submittedText,
          timestamp,
        });

        await store.saveEpisode(revisedEpisode);

        return {
          status: 'needs-revision',
          episode: revisedEpisode,
          guidance: payload.guidance,
        };
      }
      const sentenceEndIndex =
        episode.sentences.length + payload.continuationSentences.length;
      const continuationAnnotations = payload.continuationAnnotations.map(
        (annotation) => ({
          ...annotation,
          sentenceIndex: episode.sentences.length + annotation.sentenceIndex,
        }),
      );
      const answeredInteractions = draftEpisode.interactions.map((interaction) =>
        interaction.id === activeInteraction.id
          ? {
              ...interaction,
              feedback: payload.feedback,
              ...(payload.languageFeedback
                ? { languageFeedback: payload.languageFeedback }
                : {}),
              updatedAt: timestamp,
            }
          : interaction,
      );
      const interactions = payload.nextInteraction
        ? [
            ...answeredInteractions,
            {
              id: `interaction:${episode.id}:${answeredInteractions.length + 1}`,
              episodeId: episode.id,
              kind: payload.nextInteraction.kind,
              prompt: payload.nextInteraction.prompt,
              choices: payload.nextInteraction.choices,
              sentenceEndIndex,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ]
        : answeredInteractions;
      const { cliffhanger: _storedCliffhanger, ...draftWithoutCliffhanger } =
        draftEpisode;
      const updatedEpisode: Episode = {
        ...draftWithoutCliffhanger,
        sceneText: `${episode.sceneText}\n\n${payload.continuationText}`,
        sentences: [...episode.sentences, ...payload.continuationSentences],
        sentenceFrames: [
          ...episode.sentenceFrames,
          ...payload.continuationSentenceFrames,
        ],
        annotations: [...episode.annotations, ...continuationAnnotations],
        interactions,
        isComplete: payload.isEpisodeComplete,
        ...(payload.cliffhanger
          ? { cliffhanger: payload.cliffhanger }
          : {}),
        summaryUpdate: payload.summaryUpdate,
        updatedAt: timestamp,
        sync: createDirtySync(timestamp, episode.id),
      };
      const updatedMemory = applyMemoryUpdate({
        memory,
        payload: payload.memoryUpdate,
        timestamp,
      });

      await store.saveEpisode(updatedEpisode);
      await store.saveSeriesMemory(updatedMemory);
      await Promise.all(
        unique(
          continuationAnnotations.flatMap((annotation) =>
            annotation.wordId ? [annotation.wordId] : [],
          ),
        ).map((wordId) =>
          store.saveLearningSignal(
            createWordSignal({
              episodeId: episode.id,
              kind: 'encountered',
              seriesId: episode.seriesId,
              timestamp,
              wordId,
            }),
          ),
        ),
      );

      return { status: 'continued', episode: updatedEpisode };
    },
  };

  return {
    execute: (input): Promise<SubmitEpisodeInteractionResult> => {
      const operationKey: string = `${input.episodeId}:${input.interactionId}`;
      const activeSubmission:
        | Promise<SubmitEpisodeInteractionResult>
        | undefined = inFlightSubmissions.get(operationKey);

      if (activeSubmission) {
        return activeSubmission;
      }

      const submission: Promise<SubmitEpisodeInteractionResult> =
        submitInteraction.execute(input);
      // clearSubmission removes only the promise currently registered for this interaction.
      const clearSubmission = (): void => {
        if (inFlightSubmissions.get(operationKey) === submission) {
          inFlightSubmissions.delete(operationKey);
        }
      };

      inFlightSubmissions.set(operationKey, submission);
      void submission.then(clearSubmission, clearSubmission);

      return submission;
    },
  };
}

// createPendingInteraction removes stale draft guidance before persisting one submission.
function createPendingInteraction({
  choiceId,
  interaction,
  replyIntent,
  submissionId,
  submittedText,
  timestamp,
}: {
  // choiceId identifies a generated option when the learner did not write free text.
  readonly choiceId?: string;
  // interaction is the unanswered local turn being updated.
  readonly interaction: EpisodeInteraction;
  // replyIntent disambiguates learner-authored text when no controlled choice exists.
  readonly replyIntent?: FreeReplyIntent;
  // submissionId is the stable retry identity persisted before network work.
  readonly submissionId: string;
  // submittedText is the normalized visible answer.
  readonly submittedText: string;
  // timestamp versions the local-first write.
  readonly timestamp: string;
}): EpisodeInteraction {
  const {
    replyDraft: _replyDraft,
    replyGuidance: _replyGuidance,
    ...stableInteraction
  } = interaction;

  return {
    ...stableInteraction,
    ...(choiceId ? { selectedChoiceId: choiceId } : {}),
    userReply: submittedText,
    ...(replyIntent ? { replyIntent } : {}),
    submissionId,
    updatedAt: timestamp,
  };
}

// restoreFreeReplyDraft turns a rejected input back into editable local state.
function restoreFreeReplyDraft({
  episode,
  guidance,
  interactionId,
  replyIntent,
  submittedText,
  timestamp,
}: {
  // episode contains the pending answer that must no longer auto-resume.
  readonly episode: Episode;
  // guidance optionally explains a recoverable semantic validation result.
  readonly guidance: EpisodeInteraction['replyGuidance'];
  // interactionId identifies the answer to restore.
  readonly interactionId: string;
  // replyIntent preserves the learner's selected Say, Do, or Direction mode.
  readonly replyIntent?: FreeReplyIntent;
  // submittedText becomes the editable draft again.
  readonly submittedText: string;
  // timestamp versions the rollback write.
  readonly timestamp: string;
}): Episode {
  return {
    ...episode,
    interactions: episode.interactions.map((interaction) => {
      if (interaction.id !== interactionId) {
        return interaction;
      }

      const {
        feedback: _feedback,
        languageFeedback: _languageFeedback,
        selectedChoiceId: _selectedChoiceId,
        submissionId: _submissionId,
        userReply: _userReply,
        ...editableInteraction
      } = interaction;

      return {
        ...editableInteraction,
        replyDraft: submittedText,
        ...(replyIntent ? { replyIntent } : {}),
        ...(guidance ? { replyGuidance: guidance } : {}),
        updatedAt: timestamp,
      };
    }),
    updatedAt: timestamp,
    sync: createDirtySync(timestamp, episode.id),
  };
}

// assertReplyIntent enforces the explicit interpretation selected in the Reader UI.
function assertReplyIntent(
  participationMode: 'director' | 'character',
  replyIntent: FreeReplyIntent | undefined,
): asserts replyIntent is FreeReplyIntent {
  const isValidCharacterIntent: boolean =
    participationMode === 'character' &&
    (replyIntent === 'speech' || replyIntent === 'action');
  const isValidDirectorIntent: boolean =
    participationMode === 'director' && replyIntent === 'direction';

  if (!isValidCharacterIntent && !isValidDirectorIntent) {
    throw new Error('Choose how your reply should affect the story.');
  }
}

// shouldRestoreDraftAfterError prevents policy or request failures from auto-resubmitting.
function shouldRestoreDraftAfterError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('kind' in error)) {
    return false;
  }

  const kind: unknown = (error as { readonly kind?: unknown }).kind;

  return (
    kind === 'moderation_warning' ||
    kind === 'moderation_banned' ||
    kind === 'validation'
  );
}

// createDirtySync marks the answered episode for future Supabase data sync.
function createDirtySync(timestamp: string, recordId: string): SyncMetadata {
  return {
    isDirty: true,
    pendingOperationId: `${timestamp}:${recordId}:interaction`,
  };
}

// resolveStoryWords maps selected ids to suitable bundled vocabulary items for AI context.
function resolveStoryWords({
  vocabulary,
  wordIds,
}: {
  // vocabulary is the bundled Oxford catalog.
  readonly vocabulary: readonly VocabularyItem[];
  // wordIds are the planned Story Words for this episode.
  readonly wordIds: readonly string[];
}): readonly VocabularyItem[] {
  const wordsById = new Map(vocabulary.map((word) => [word.id, word]));

  return wordIds.flatMap((wordId) => {
    const word = wordsById.get(wordId);

    // Episode continuations must retain every explicit Story Word selected at setup time.
    return word ? [word] : [];
  });
}

// createWordSignal records newly encountered Story Words after an interaction continuation.
function createWordSignal({
  episodeId,
  kind,
  seriesId,
  timestamp,
  wordId,
}: {
  // episodeId links the signal to generated context.
  readonly episodeId: string;
  // kind records the vocabulary event without a review queue.
  readonly kind: LearningSignal['kind'];
  // seriesId scopes the signal to the personal story.
  readonly seriesId: string;
  // timestamp is the local event time.
  readonly timestamp: string;
  // wordId links the signal to the bundled Oxford vocabulary item.
  readonly wordId: string;
}): LearningSignal {
  return {
    id: `signal:${seriesId}:${episodeId}:${wordId}:${kind}`,
    wordId,
    kind,
    seriesId,
    episodeId,
    occurredAt: timestamp,
    updatedAt: timestamp,
    sync: createDirtySync(timestamp, `signal:${episodeId}:${wordId}:${kind}`),
  };
}

// unique removes duplicate ids while preserving first occurrence.
function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
