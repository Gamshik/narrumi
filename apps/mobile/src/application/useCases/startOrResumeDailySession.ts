import type { Clock, LocalProgressStore, VocabularyCatalog } from '@application/ports';
import type { DailyLearningSession, LearningPreferences } from '@domain/index';
import { DEFAULT_DAILY_WORD_GOAL, DEFAULT_REQUIRED_REVIEW_CYCLES } from '@domain/index';

// StartOrResumeDailySessionInput optionally overrides the local daily word goal.
export type StartOrResumeDailySessionInput = {
  // dailyWordGoal lets the user choose today's word count before session assembly.
  readonly dailyWordGoal?: number;
};

// StartOrResumeDailySessionResult returns the session chosen for today's practice.
export type StartOrResumeDailySessionResult = {
  // session is the local daily session persisted in AsyncStorage.
  readonly session: DailyLearningSession;
};

// StartOrResumeDailySession assembles or resumes the local daily practice queue.
export type StartOrResumeDailySession = {
  // execute loads preferences, vocabulary, progress, then persists a local session.
  readonly execute: (
    input?: StartOrResumeDailySessionInput,
  ) => Promise<StartOrResumeDailySessionResult>;
};

// createStartOrResumeDailySession injects local storage, catalog, and time sources.
export function createStartOrResumeDailySession(
  store: LocalProgressStore,
  catalog: VocabularyCatalog,
  clock: Clock,
): StartOrResumeDailySession {
  return {
    execute: async (input = {}) => {
      const now = clock.now();
      const dateKey = toDateKey(now);
      const existingSession = await store.getDailySession(dateKey);

      if (existingSession) {
        return { session: existingSession };
      }

      const preferences = await ensurePreferences(store, clock, input.dailyWordGoal);
      const allProgress = await store.getAllWordProgress();
      const blockedWordIds = new Set(
        allProgress
          .filter((progress) => progress.status !== 'learning')
          .map((progress) => progress.wordId),
      );
      const dueReviewIds = allProgress
        .filter((progress) => isDueForReview(progress.nextReviewAt, now))
        .map((progress) => progress.wordId);
      const vocabulary = await catalog.list();
      const newWordIds = vocabulary
        .filter((word) => !blockedWordIds.has(word.id))
        .slice(0, preferences.dailyWordGoal)
        .map((word) => word.id);
      const wordIds = [...dueReviewIds, ...newWordIds].slice(
        0,
        preferences.dailyWordGoal,
      );
      const timestamp = now.toISOString();
      const session: DailyLearningSession = {
        id: dateKey,
        dateKey,
        dailyWordGoal: preferences.dailyWordGoal,
        wordIds,
        completedWordIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:daily-session:${dateKey}:create`,
        },
      };

      await store.saveDailySession(session);

      return { session };
    },
  };
}

// ensurePreferences saves local defaults or the user's selected daily goal.
async function ensurePreferences(
  store: LocalProgressStore,
  clock: Clock,
  dailyWordGoal: number | undefined,
): Promise<LearningPreferences> {
  const existing = await store.getPreferences();

  if (existing && dailyWordGoal === undefined) {
    return existing;
  }

  const timestamp = clock.now().toISOString();
  const preferences: LearningPreferences = {
    dailyWordGoal: dailyWordGoal ?? existing?.dailyWordGoal ?? DEFAULT_DAILY_WORD_GOAL,
    requiredReviewCycles:
      existing?.requiredReviewCycles ?? DEFAULT_REQUIRED_REVIEW_CYCLES,
    updatedAt: timestamp,
  };

  await store.savePreferences(preferences);

  return preferences;
}

// isDueForReview checks scheduled review availability without network access.
function isDueForReview(nextReviewAt: string | undefined, now: Date): boolean {
  return nextReviewAt !== undefined && Date.parse(nextReviewAt) <= now.getTime();
}

// toDateKey creates the local session id for a calendar day.
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
