// EpisodeAnswerPresentationInput describes the state that selects a settled answer surface.
export type EpisodeAnswerPresentationInput = {
  // hasFeedback means generation completed and the answer can no longer be pending.
  readonly hasFeedback: boolean;
  // hasSavedAnswer means the learner choice is already visible in the reader.
  readonly hasSavedAnswer: boolean;
  // isReadOnly identifies history and full-series reader entry points.
  readonly isReadOnly: boolean;
  // isSubmitting keeps the continuation animation active for the latest choice.
  readonly isSubmitting: boolean;
};

// shouldRenderSettledEpisodeAnswer prevents a route flag from hiding active generation.
export function shouldRenderSettledEpisodeAnswer({
  hasFeedback,
  hasSavedAnswer,
  isReadOnly,
  isSubmitting,
}: EpisodeAnswerPresentationInput): boolean {
  return hasFeedback || (isReadOnly && hasSavedAnswer && !isSubmitting);
}
