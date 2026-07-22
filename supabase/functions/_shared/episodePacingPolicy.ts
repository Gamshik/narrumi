// EPISODE_INTERACTION_LIMITS are the deterministic bounds for one episode arc.
export const EPISODE_INTERACTION_LIMITS = {
  // minimumBeforeCompletion prevents a model from ending an episode too early.
  minimumBeforeCompletion: 5,
  // maximumBeforeCompletion prevents an episode from continuing indefinitely.
  maximumBeforeCompletion: 10,
} as const;

// ResolveEpisodeCompletionInput combines the model preference with trusted turn count.
export type ResolveEpisodeCompletionInput = {
  // interactionCount is the one-based learner interaction currently being answered.
  readonly interactionCount: number;
  // modelRequestedCompletion is the writer's semantic ending decision.
  readonly modelRequestedCompletion: boolean;
};

// resolveEpisodeCompletion permits model choice only inside the product's 5-10 window.
export function resolveEpisodeCompletion({
  interactionCount,
  modelRequestedCompletion,
}: ResolveEpisodeCompletionInput): boolean {
  if (interactionCount < EPISODE_INTERACTION_LIMITS.minimumBeforeCompletion) {
    return false;
  }

  if (interactionCount >= EPISODE_INTERACTION_LIMITS.maximumBeforeCompletion) {
    return true;
  }

  return modelRequestedCompletion;
}
