import {
  buildCompactSeriesMemoryPayload,
  SAFETY_AND_COPYRIGHT_CONSTRAINTS,
} from '@application/ai/episodeAiPayload';
import type {
  Clock,
  InteractionGateway,
  LocalSeriesStore,
  NetworkStatus,
} from '@application/ports';
import type { Episode, SyncMetadata } from '@domain/index';

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
  networkStatus: NetworkStatus,
  gateway: InteractionGateway,
  clock: Clock,
): SubmitEpisodeInteraction {
  return {
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

      const activeInteraction = episode.interactions.find(
        (interaction) =>
          interaction.id === interactionId && interaction.feedback === undefined,
      );

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

      const payload = await gateway.submitInteraction({
        episodeId,
        interactionId: activeInteraction.id,
        seriesId: episode.seriesId,
        cefrLevel: series.cefrLevel,
        genre: series.genre,
        tone: series.tone,
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
        ...(choiceId ? { selectedChoiceId: choiceId } : {}),
        ...(selectedChoice ? { selectedChoiceLabel: selectedChoice.label } : {}),
        userReply: submittedText,
        safetyAndCopyrightConstraints: SAFETY_AND_COPYRIGHT_CONSTRAINTS,
      });
      const sentenceEndIndex =
        episode.sentences.length + payload.continuationSentences.length;
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

      return { episode: updatedEpisode };
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
