import type { Episode, EpisodeInteraction } from '@domain/index';

// PendingEpisodeContinuation carries the persisted answer needed to resume one interrupted request.
export type PendingEpisodeContinuation = {
  // episodeId identifies the locally stored episode passed back to the use case.
  readonly episodeId: string;
  // episodeIndex replaces the correct item in single-episode and full-series readers.
  readonly episodeIndex: number;
  // interactionId identifies the answered turn that still lacks AI feedback.
  readonly interactionId: string;
  // choiceId restores a controlled learner choice when one was saved.
  readonly choiceId?: string;
  // userReply restores the persisted visible answer for free-form and choice interactions.
  readonly userReply?: string;
};

// findPendingEpisodeContinuation returns the newest saved answer whose continuation never completed.
export function findPendingEpisodeContinuation(
  episodes: readonly Episode[],
): PendingEpisodeContinuation | undefined {
  for (let episodeIndex = episodes.length - 1; episodeIndex >= 0; episodeIndex -= 1) {
    const episode: Episode | undefined = episodes[episodeIndex];

    if (!episode || episode.isComplete) {
      continue;
    }

    // interaction is the newest durable answer that still awaits its generated continuation.
    const interaction: EpisodeInteraction | undefined = [...episode.interactions]
      .reverse()
      .find(
        (candidate: EpisodeInteraction): boolean =>
          candidate.feedback === undefined &&
          (candidate.selectedChoiceId !== undefined ||
            (candidate.userReply?.trim().length ?? 0) > 0),
      );

    if (!interaction) {
      continue;
    }

    return {
      episodeId: episode.id,
      episodeIndex,
      interactionId: interaction.id,
      ...(interaction.selectedChoiceId
        ? { choiceId: interaction.selectedChoiceId }
        : {}),
      ...(interaction.userReply?.trim()
        ? { userReply: interaction.userReply.trim() }
        : {}),
    };
  }

  return undefined;
}
