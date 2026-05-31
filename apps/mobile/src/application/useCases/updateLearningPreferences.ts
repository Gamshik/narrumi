import type { Clock, LocalProgressStore } from '@application/ports';
import {
  clampDailyWordGoal,
  clampRequiredReviewCycles,
  DEFAULT_DAILY_WORD_GOAL,
  DEFAULT_REQUIRED_REVIEW_CYCLES,
  type LearningPreferences,
} from '@domain/index';

// UpdateLearningPreferencesInput contains focused local settings changes.
export type UpdateLearningPreferencesInput = {
  // dailyWordGoal updates the preferred count of new words per day.
  readonly dailyWordGoal?: number;
  // requiredReviewCycles updates the mastery target.
  readonly requiredReviewCycles?: number;
};

// UpdateLearningPreferences writes bounded local settings for future sessions.
export type UpdateLearningPreferences = {
  // execute persists the new settings locally and returns the saved value.
  readonly execute: (
    input: UpdateLearningPreferencesInput,
  ) => Promise<LearningPreferences>;
};

// createUpdateLearningPreferences injects local persistence and clock dependencies.
export function createUpdateLearningPreferences(
  store: LocalProgressStore,
  clock: Clock,
): UpdateLearningPreferences {
  return {
    execute: async (input) => {
      const existing = await store.getPreferences();
      const timestamp = clock.now().toISOString();
      const preferences: LearningPreferences = {
        dailyWordGoal: clampDailyWordGoal(
          input.dailyWordGoal ?? existing?.dailyWordGoal ?? DEFAULT_DAILY_WORD_GOAL,
        ),
        requiredReviewCycles: clampRequiredReviewCycles(
          input.requiredReviewCycles ??
            existing?.requiredReviewCycles ??
            DEFAULT_REQUIRED_REVIEW_CYCLES,
        ),
        updatedAt: timestamp,
      };

      await store.savePreferences(preferences);

      return preferences;
    },
  };
}
