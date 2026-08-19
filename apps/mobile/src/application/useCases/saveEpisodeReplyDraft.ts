import type { Clock, LocalSeriesStore } from '@application/ports';
import type { Episode, FreeReplyIntent, SyncMetadata } from '@domain/index';

// SaveEpisodeReplyDraftInput identifies one local free-text draft and its story intent.
export type SaveEpisodeReplyDraftInput = {
  // episodeId identifies the unfinished local episode.
  readonly episodeId: string;
  // interactionId identifies the latest unanswered story decision.
  readonly interactionId: string;
  // text is the learner-authored draft; blank text clears the persisted draft.
  readonly text: string;
  // intent tells Character mode speech from action and Producer mode direction.
  readonly intent: FreeReplyIntent;
};

// SaveEpisodeReplyDraftResult returns the locally persisted episode snapshot.
export type SaveEpisodeReplyDraftResult = {
  // episode contains the latest draft state for immediate reader rendering.
  readonly episode: Episode;
};

// SaveEpisodeReplyDraft persists typing without requiring connectivity or AI work.
export type SaveEpisodeReplyDraft = {
  // execute validates and saves only the latest unanswered interaction draft.
  readonly execute: (
    input: SaveEpisodeReplyDraftInput,
  ) => Promise<SaveEpisodeReplyDraftResult>;
};

// createSaveEpisodeReplyDraft keeps draft persistence outside the Reader component.
export function createSaveEpisodeReplyDraft(
  store: LocalSeriesStore,
  clock: Clock,
): SaveEpisodeReplyDraft {
  return {
    execute: async ({ episodeId, interactionId, intent, text }) => {
      const episode: Episode | undefined = await store.getEpisode(episodeId);

      if (!episode || episode.isComplete) {
        throw new Error('An unfinished episode is required to save a reply.');
      }

      const interactionIndex: number = episode.interactions.findIndex(
        (interaction): boolean => interaction.id === interactionId,
      );
      const interaction = episode.interactions[interactionIndex];
      const latestPendingInteraction = [...episode.interactions]
        .reverse()
        .find((candidate): boolean => candidate.feedback === undefined);

      if (
        !interaction ||
        latestPendingInteraction?.id !== interaction.id ||
        interaction.userReply !== undefined ||
        interaction.selectedChoiceId !== undefined
      ) {
        throw new Error('Only the latest unanswered interaction can keep a draft.');
      }

      const timestamp: string = clock.now().toISOString();
      const normalizedText: string = text.replace(/\s+/g, ' ').trim();
      const sync: SyncMetadata = {
        isDirty: true,
        pendingOperationId: `${timestamp}:${episode.id}:reply-draft`,
      };
      const updatedEpisode: Episode = {
        ...episode,
        interactions: episode.interactions.map((candidate) => {
          if (candidate.id !== interaction.id) {
            return candidate;
          }

          // Editing always clears guidance produced for an older draft.
          const {
            replyDraft: _replyDraft,
            replyGuidance: _replyGuidance,
            ...editableInteraction
          } = candidate;

          return {
            ...editableInteraction,
            ...(normalizedText ? { replyDraft: normalizedText } : {}),
            replyIntent: intent,
            updatedAt: timestamp,
          };
        }),
        updatedAt: timestamp,
        sync,
      };

      await store.saveEpisode(updatedEpisode);

      return { episode: updatedEpisode };
    },
  };
}
