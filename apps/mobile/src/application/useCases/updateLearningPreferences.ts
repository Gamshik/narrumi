import type { Clock, LocalSeriesStore } from '@application/ports';
import {
  clampStoryWordGoal,
  defaultLearningGenre,
  DEFAULT_STORY_WORD_GOAL,
  type CefrLevel,
  type LearningPreferences,
  type LearningGenre,
} from '@domain/index';

// UpdateLearningPreferencesInput contains focused local settings changes.
export type UpdateLearningPreferencesInput = {
  // preferredCefrLevel updates the default target for a series' first episode.
  readonly preferredCefrLevel?: CefrLevel;
  // preferredGenre remains writable for backward-compatible preference sync.
  readonly preferredGenre?: LearningGenre;
  // storyWordGoal updates automatic Story Word suggestion count.
  readonly storyWordGoal?: number;
};

// UpdateLearningPreferences writes bounded local settings for future series work.
export type UpdateLearningPreferences = {
  // execute persists the new settings locally and returns the saved value.
  readonly execute: (
    input: UpdateLearningPreferencesInput,
  ) => Promise<LearningPreferences>;
};

// createUpdateLearningPreferences injects local persistence and clock dependencies.
export function createUpdateLearningPreferences(
  store: LocalSeriesStore,
  clock: Clock,
): UpdateLearningPreferences {
  return {
    execute: async (input) => {
      const existing = await store.getPreferences();
      const timestamp = clock.now().toISOString();
      const preferences: LearningPreferences = {
        preferredCefrLevel:
          input.preferredCefrLevel ?? existing?.preferredCefrLevel ?? 'B1',
        preferredGenre:
          input.preferredGenre ?? existing?.preferredGenre ?? defaultLearningGenre,
        storyWordGoal: clampStoryWordGoal(
          input.storyWordGoal ?? existing?.storyWordGoal ?? DEFAULT_STORY_WORD_GOAL,
        ),
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:preferences:update`,
          ...(existing?.sync.lastSyncedAt
            ? { lastSyncedAt: existing.sync.lastSyncedAt }
            : {}),
        },
      };

      await store.savePreferences(preferences);

      return preferences;
    },
  };
}
