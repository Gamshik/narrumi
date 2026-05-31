import type { LearningGenre } from './learningGenre';

// DailyLearningSession is the local session state resumed for the current day.
export type DailyLearningSession = {
  // id is stable for the local calendar day so the session can be resumed.
  readonly id: string;
  // dateKey stores the local YYYY-MM-DD day represented by this session.
  readonly dateKey: string;
  // dailyWordGoal is snapshotted so changing settings does not mutate a running queue.
  readonly dailyWordGoal: number;
  // wordIds are the ordered vocabulary cards selected for today's practice.
  readonly wordIds: readonly string[];
  // completedWordIds records cards finished during local practice.
  readonly completedWordIds: readonly string[];
  // selectedGenre stores the user's context choice for the future story request.
  readonly selectedGenre?: LearningGenre;
  // createdAt records when the local session was first assembled.
  readonly createdAt: string;
  // updatedAt is used for local resume and future sync reconciliation.
  readonly updatedAt: string;
  // completedAt marks the session done after local practice and genre choice.
  readonly completedAt?: string;
  // sync stores local dirty metadata without pushing remote writes yet.
  readonly sync: {
    // isDirty tells future sync code that the session changed locally.
    readonly isDirty: boolean;
    // pendingOperationId gives future sync code a stable local operation identity.
    readonly pendingOperationId: string;
    // lastSyncedAt stores the last successful remote sync timestamp when one exists.
    readonly lastSyncedAt?: string;
  };
};
