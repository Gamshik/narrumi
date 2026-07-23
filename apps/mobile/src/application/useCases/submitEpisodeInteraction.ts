import {
  buildAiStoryWord,
  buildCompactSeriesMemoryPayload,
  SAFETY_AND_COPYRIGHT_CONSTRAINTS,
} from '@application/ai/episodeAiPayload';
import type {
  Clock,
  InteractionGateway,
  LocalSeriesStore,
  NetworkStatus,
  VocabularyCatalog,
} from '@application/ports';
import type {
  CefrLevel,
  Episode,
  LearningSignal,
  SyncMetadata,
  VocabularyItem,
} from '@domain/index';

import { applyMemoryUpdate } from './generateEpisode';
import { isStoryWordCandidate } from './storyWordSelection';

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
};

// SubmitEpisodeInteractionResult returns the updated same episode after persistence.
export type SubmitEpisodeInteractionResult = {
  // episode is the saved record with answer, feedback, and continuation text.
  readonly episode: Episode;
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
    execute: async ({ choiceId, episodeId, interactionId, userReply }) => {
      const connectivity = await networkStatus.getCurrentState();

      if (!connectivity.isOnline) {
        throw new Error('Story interaction is available only when online.');
      }

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
        return { episode };
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

      const selectedChoice = choiceId
        ? activeInteraction.choices.find((choice) => choice.id === choiceId)
        : undefined;
      const submittedText = userReply?.trim() || selectedChoice?.label;

      if (!submittedText) {
        throw new Error('A story answer is required.');
      }

      const timestamp = clock.now().toISOString();
      const draftEpisode: Episode = {
        ...episode,
        interactions: episode.interactions.map((interaction) =>
          interaction.id === activeInteraction.id
            ? {
                ...interaction,
                ...(choiceId ? { selectedChoiceId: choiceId } : {}),
                userReply: submittedText,
                updatedAt: timestamp,
              }
            : interaction,
        ),
        updatedAt: timestamp,
        sync: createDirtySync(timestamp, episode.id),
      };

      await store.saveEpisode(draftEpisode);
      // Vocabulary loading can be comparatively expensive; the pending answer must be durable first.
      const vocabulary = await catalog.list();

      const payload = await gateway.submitInteraction({
        episodeId,
        interactionId: activeInteraction.id,
        seriesId: episode.seriesId,
        seriesTitle: series.title,
        cefrLevel: series.cefrLevel,
        genre: series.genre,
        tone: series.tone,
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
          maxLevel: series.cefrLevel,
          vocabulary,
          wordIds: episode.storyWordIds,
        }).map(buildAiStoryWord),
        encounteredStoryWordIds: unique(
          episode.annotations.flatMap((annotation) =>
            annotation.wordId ? [annotation.wordId] : [],
          ),
        ),
        ...(choiceId ? { selectedChoiceId: choiceId } : {}),
        ...(selectedChoice ? { selectedChoiceLabel: selectedChoice.label } : {}),
        // Controlled labels are AI-authored context. Only free-form text crosses
        // the moderation boundary as a learner-authored userReply.
        ...(!choiceId ? { userReply: submittedText } : {}),
        safetyAndCopyrightConstraints: SAFETY_AND_COPYRIGHT_CONSTRAINTS,
      });
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

      return { episode: updatedEpisode };
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

// createDirtySync marks the answered episode for future Supabase data sync.
function createDirtySync(timestamp: string, recordId: string): SyncMetadata {
  return {
    isDirty: true,
    pendingOperationId: `${timestamp}:${recordId}:interaction`,
  };
}

// resolveStoryWords maps selected ids to suitable bundled vocabulary items for AI context.
function resolveStoryWords({
  maxLevel,
  vocabulary,
  wordIds,
}: {
  // maxLevel keeps stale saved word ids from exceeding the active series CEFR level.
  readonly maxLevel: CefrLevel;
  // vocabulary is the bundled Oxford catalog.
  readonly vocabulary: readonly VocabularyItem[];
  // wordIds are the planned Story Words for this episode.
  readonly wordIds: readonly string[];
}): readonly VocabularyItem[] {
  const wordsById = new Map(vocabulary.map((word) => [word.id, word]));

  return wordIds.flatMap((wordId) => {
    const word = wordsById.get(wordId);

    return word && isStoryWordCandidate(word, maxLevel) ? [word] : [];
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
