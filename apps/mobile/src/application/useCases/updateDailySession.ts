import type { Clock, LocalProgressStore } from '@application/ports';
import type { DailyLearningSession, LearningGenre } from '@domain/index';

// UpdateDailySessionInput carries local changes to the current daily session.
export type UpdateDailySessionInput = {
  // session is the current local session snapshot from presentation state.
  readonly session: DailyLearningSession;
  // completedWordId marks one practiced card as locally complete when provided.
  readonly completedWordId?: string;
  // selectedGenre stores the user's story genre choice when provided.
  readonly selectedGenre?: LearningGenre;
  // shouldComplete marks the daily session complete after local practice.
  readonly shouldComplete?: boolean;
};

// UpdateDailySession persists focused local session changes.
export type UpdateDailySession = {
  // execute writes the updated session locally and returns the saved value.
  readonly execute: (input: UpdateDailySessionInput) => Promise<DailyLearningSession>;
};

// createUpdateDailySession injects local storage and clock dependencies.
export function createUpdateDailySession(
  store: LocalProgressStore,
  clock: Clock,
): UpdateDailySession {
  return {
    execute: async (input) => {
      const timestamp = clock.now().toISOString();
      const completedWordIds = input.completedWordId
        ? unique([...input.session.completedWordIds, input.completedWordId])
        : input.session.completedWordIds;
      const session: DailyLearningSession = {
        ...input.session,
        completedWordIds,
        ...(input.selectedGenre ? { selectedGenre: input.selectedGenre } : {}),
        ...(input.shouldComplete ? { completedAt: timestamp } : {}),
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:daily-session:${input.session.dateKey}:update`,
          ...(input.session.sync.lastSyncedAt
            ? { lastSyncedAt: input.session.sync.lastSyncedAt }
            : {}),
        },
      };

      await store.saveDailySession(session);

      return session;
    },
  };
}

// unique removes duplicate completed word ids while preserving order.
function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
