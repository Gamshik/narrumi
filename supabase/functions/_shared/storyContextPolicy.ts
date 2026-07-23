// StoryDecisionInput is the untrusted persisted interaction shape before writer isolation.
export type StoryDecisionInput = {
  // prompt is the decision cue that the learner answered.
  readonly prompt: string;
  // answer is the learner choice or free-form reply that changed the story.
  readonly answer: string;
  // feedback is tutoring metadata and must never enter creative story context.
  readonly feedback?: string;
};

// StoryDecisionContext is the minimal causal history needed by a story writer.
export type StoryDecisionContext = {
  // prompt identifies the decision point without carrying tutor commentary.
  readonly prompt: string;
  // answer is the only learner-authored consequence the writer must preserve.
  readonly answer: string;
};

// buildStoryDecisionHistory removes tutoring text and keeps only the latest bounded decisions.
export function buildStoryDecisionHistory(
  decisions: readonly StoryDecisionInput[],
  limit: number,
): readonly StoryDecisionContext[] {
  if (limit <= 0) {
    return [];
  }

  return decisions.slice(-limit).map(
    (decision: StoryDecisionInput): StoryDecisionContext => ({
      prompt: decision.prompt,
      answer: decision.answer,
    }),
  );
}
