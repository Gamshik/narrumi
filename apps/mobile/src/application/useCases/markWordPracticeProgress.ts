import type { Clock, LocalProgressStore } from '@application/ports';
import type {
  LearnedWordProgress,
  LearningPreferences,
  WordPracticeDecision,
} from '@domain/index';

// FIRST_REVIEW_DELAY_MINUTES is the MVP-defined delay after a word is learned.
const FIRST_REVIEW_DELAY_MINUTES = 30;

// MarkWordPracticeProgressInput is the command accepted by the progress use case.
export type MarkWordPracticeProgressInput = {
  // wordId identifies the bundled vocabulary item being practiced.
  readonly wordId: string;
  // decision captures the user's card action without exposing UI gestures.
  readonly decision: WordPracticeDecision;
};

// MarkWordPracticeProgressResult returns the locally persisted progress record.
export type MarkWordPracticeProgressResult = {
  // progress is the authoritative local progress after the decision is applied.
  readonly progress: LearnedWordProgress;
};

// MarkWordPracticeProgress coordinates local-first word progress updates.
export type MarkWordPracticeProgress = {
  // execute applies one practice decision and persists it locally before returning.
  readonly execute: (
    input: MarkWordPracticeProgressInput,
  ) => Promise<MarkWordPracticeProgressResult>;
};

// createMarkWordPracticeProgress injects storage and time dependencies.
export function createMarkWordPracticeProgress(
  store: LocalProgressStore,
  clock: Clock,
): MarkWordPracticeProgress {
  return {
    execute: async (input) => {
      const existing = await store.getWordProgress(input.wordId);
      const preferences = await store.getPreferences();
      const now = clock.now();
      const progress = applyDecision(input, existing, preferences, now);

      await store.saveWordProgress(progress);

      return { progress };
    },
  };
}

// applyDecision encodes the product card rules for local practice progress.
function applyDecision(
  input: MarkWordPracticeProgressInput,
  existing: LearnedWordProgress | undefined,
  preferences: LearningPreferences | undefined,
  now: Date,
): LearnedWordProgress {
  const timestamp = now.toISOString();
  const pendingOperationId = `${timestamp}:${input.wordId}:${input.decision}`;
  const baseCycle = existing?.reviewCycle ?? 0;

  if (input.decision === 'skip-new') {
    return createProgress(input.wordId, 'skipped', 0, timestamp, pendingOperationId);
  }

  if (input.decision === 'start-learning' || input.decision === 'keep-learning') {
    return createProgress(input.wordId, 'learning', baseCycle, timestamp, pendingOperationId);
  }

  if (input.decision === 'mark-learned') {
    return createProgress(
      input.wordId,
      'in-review',
      Math.max(1, baseCycle),
      timestamp,
      pendingOperationId,
      addMinutes(now, FIRST_REVIEW_DELAY_MINUTES).toISOString(),
    );
  }

  if (input.decision === 'remember-review') {
    const requiredCycles = preferences?.requiredReviewCycles ?? 5;
    const nextCycle = Math.max(1, baseCycle + 1);
    const status = nextCycle >= requiredCycles ? 'mastered' : 'in-review';

    return createProgress(
      input.wordId,
      status,
      nextCycle,
      timestamp,
      pendingOperationId,
      status === 'in-review'
        ? addMinutes(now, getReviewDelayMinutes(nextCycle)).toISOString()
        : undefined,
    );
  }

  const previousCycle = Math.max(1, baseCycle - 1);

  return createProgress(
    input.wordId,
    'in-review',
    previousCycle,
    timestamp,
    pendingOperationId,
    addMinutes(now, getReviewDelayMinutes(previousCycle)).toISOString(),
  );
}

// createProgress builds the canonical dirty local progress record.
function createProgress(
  wordId: string,
  status: LearnedWordProgress['status'],
  reviewCycle: number,
  timestamp: string,
  pendingOperationId: string,
  nextReviewAt?: string,
): LearnedWordProgress {
  return {
    wordId,
    status,
    reviewCycle,
    ...(nextReviewAt ? { nextReviewAt } : {}),
    lastPracticedAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId,
    },
  };
}

// getReviewDelayMinutes returns deterministic placeholder delays until product defines all cycles.
function getReviewDelayMinutes(reviewCycle: number): number {
  return FIRST_REVIEW_DELAY_MINUTES * Math.max(1, reviewCycle);
}

// addMinutes creates a new Date without mutating the injected clock value.
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
