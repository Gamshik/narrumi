import type { Clock, LocalProgressStore } from '@application/ports';
import {
  DEFAULT_DAILY_WORD_GOAL,
  DEFAULT_REQUIRED_REVIEW_CYCLES,
  type LearningPreferences,
} from '@domain/index';

// LoadLearningPreferencesResult returns the persisted or default local settings.
export type LoadLearningPreferencesResult = {
  // preferences are the local card settings used by daily practice.
  readonly preferences: LearningPreferences;
};

// LoadLearningPreferences reads card settings without exposing storage details.
export type LoadLearningPreferences = {
  // execute returns saved local preferences or initializes product defaults.
  readonly execute: () => Promise<LoadLearningPreferencesResult>;
};

// createLoadLearningPreferences injects storage and time dependencies.
export function createLoadLearningPreferences(
  store: LocalProgressStore,
  clock: Clock,
): LoadLearningPreferences {
  return {
    execute: async () => {
      const existing = await store.getPreferences();

      if (existing) {
        return { preferences: existing };
      }

      const timestamp = clock.now().toISOString();
      const preferences: LearningPreferences = {
        dailyWordGoal: DEFAULT_DAILY_WORD_GOAL,
        requiredReviewCycles: DEFAULT_REQUIRED_REVIEW_CYCLES,
        updatedAt: timestamp,
      };

      await store.savePreferences(preferences);

      return { preferences };
    },
  };
}
