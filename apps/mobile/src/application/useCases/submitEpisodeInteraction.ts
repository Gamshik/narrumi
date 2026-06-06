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

// SubmitEpisodeInteractionInput captures one learner answer inside a saved episode.
export type SubmitEpisodeInteractionInput = {
  // episodeId identifies the unanswered local episode.
  readonly episodeId: string;
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
    execute: async ({ choiceId, episodeId, userReply }) => {
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

      const selectedChoice = choiceId
        ? episode.interaction.choices.find((choice) => choice.id === choiceId)
        : undefined;
      const submittedText = userReply?.trim() || selectedChoice?.label;

      if (!submittedText) {
        throw new Error('A story answer is required.');
      }

      const payload = await gateway.submitInteraction({
        episodeId,
        seriesId: episode.seriesId,
        cefrLevel: series.cefrLevel,
        genre: series.genre,
        tone: series.tone,
        compactSeriesMemory: buildCompactSeriesMemoryPayload(memory),
        episodeSummary: episode.summaryUpdate,
        interactionPrompt: episode.interaction.prompt,
        ...(choiceId ? { selectedChoiceId: choiceId } : {}),
        ...(selectedChoice ? { selectedChoiceLabel: selectedChoice.label } : {}),
        userReply: submittedText,
        safetyAndCopyrightConstraints: SAFETY_AND_COPYRIGHT_CONSTRAINTS,
      });
      const timestamp = clock.now().toISOString();
      const updatedEpisode: Episode = {
        ...episode,
        sceneText: `${episode.sceneText}\n\n${payload.continuationText}`,
        sentences: [...episode.sentences, ...payload.continuationSentences],
        interaction: {
          ...episode.interaction,
          ...(choiceId ? { selectedChoiceId: choiceId } : {}),
          userReply: submittedText,
          feedback: payload.feedback,
          updatedAt: timestamp,
        },
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
