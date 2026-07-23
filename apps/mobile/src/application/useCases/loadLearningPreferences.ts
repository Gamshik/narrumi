import type { Clock, LocalSeriesStore } from '@application/ports';
import {
  defaultLearningGenre,
  DEFAULT_STORY_WORD_GOAL,
  type LearningPreferences,
} from '@domain/index';

// LoadLearningPreferencesResult returns the persisted or default local settings.
export type LoadLearningPreferencesResult = {
  // preferences contain the first-episode CEFR default and Story Words settings.
  readonly preferences: LearningPreferences;
};

// LoadLearningPreferences reads card settings without exposing storage details.
export type LoadLearningPreferences = {
  // execute returns saved local preferences or initializes product defaults.
  readonly execute: () => Promise<LoadLearningPreferencesResult>;
};

// createLoadLearningPreferences injects storage and time dependencies.
export function createLoadLearningPreferences(
  store: LocalSeriesStore,
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
        preferredCefrLevel: 'B1',
        preferredGenre: defaultLearningGenre,
        storyWordGoal: DEFAULT_STORY_WORD_GOAL,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:preferences:create`,
        },
      };

      await store.savePreferences(preferences);

      return { preferences };
    },
  };
}
