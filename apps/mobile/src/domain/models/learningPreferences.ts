// DEFAULT_DAILY_WORD_GOAL is the product default for new words per day.
export const DEFAULT_DAILY_WORD_GOAL = 5;

// MIN_DAILY_WORD_GOAL is the lower product bound for daily new words.
export const MIN_DAILY_WORD_GOAL = 3;

// MAX_DAILY_WORD_GOAL is the upper product bound for daily new words.
export const MAX_DAILY_WORD_GOAL = 20;

// DEFAULT_REQUIRED_REVIEW_CYCLES is the product default for mastery.
export const DEFAULT_REQUIRED_REVIEW_CYCLES = 5;

// MIN_REQUIRED_REVIEW_CYCLES is the lower product bound for mastery repetitions.
export const MIN_REQUIRED_REVIEW_CYCLES = 2;

// MAX_REQUIRED_REVIEW_CYCLES is the upper product bound for mastery repetitions.
export const MAX_REQUIRED_REVIEW_CYCLES = 8;

// LearningPreferences stores the local settings that shape daily card sessions.
export type LearningPreferences = {
  // dailyWordGoal controls how many unseen words enter a new daily session.
  readonly dailyWordGoal: number;
  // requiredReviewCycles controls when an in-review word becomes mastered.
  readonly requiredReviewCycles: number;
  // updatedAt is retained for future preference sync conflict resolution.
  readonly updatedAt: string;
};

// clampDailyWordGoal enforces the product-supported daily goal range.
export function clampDailyWordGoal(value: number): number {
  return Math.min(MAX_DAILY_WORD_GOAL, Math.max(MIN_DAILY_WORD_GOAL, value));
}

// clampRequiredReviewCycles enforces the product-supported mastery range.
export function clampRequiredReviewCycles(value: number): number {
  return Math.min(
    MAX_REQUIRED_REVIEW_CYCLES,
    Math.max(MIN_REQUIRED_REVIEW_CYCLES, value),
  );
}
