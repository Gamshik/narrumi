// practiceProgressStatuses is the persisted vocabulary state set for local practice.
export const practiceProgressStatuses: readonly [
  'skipped',
  'learning',
  'in-review',
  'mastered',
] = ['skipped', 'learning', 'in-review', 'mastered'] as const;

// PracticeProgressStatus is the explicit local progress state for one word.
export type PracticeProgressStatus = (typeof practiceProgressStatuses)[number];

// SyncMetadata marks local-first writes that must later be reconciled with Supabase.
export type SyncMetadata = {
  // isDirty tells future sync code that this record has unapplied local changes.
  readonly isDirty: boolean;
  // pendingOperationId gives future sync code a stable local operation identity.
  readonly pendingOperationId: string;
  // lastSyncedAt stores the last successful remote sync timestamp when one exists.
  readonly lastSyncedAt?: string;
};

// LearnedWordProgress is the validated domain record stored per practiced word.
export type LearnedWordProgress = {
  // wordId links progress to the bundled Oxford vocabulary item.
  readonly wordId: string;
  // status controls whether the word appears in learning, review, or mastered queues.
  readonly status: PracticeProgressStatus;
  // reviewCycle tracks successful review repetitions for scheduling mastery.
  readonly reviewCycle: number;
  // nextReviewAt gates scheduled review cards when the word is in review.
  readonly nextReviewAt?: string;
  // lastPracticedAt records the latest local practice action timestamp.
  readonly lastPracticedAt: string;
  // updatedAt is used for deterministic future sync conflict resolution.
  readonly updatedAt: string;
  // sync stores local dirty metadata without attempting remote writes in this step.
  readonly sync: SyncMetadata;
};

// WordPracticeDecision is the user intent accepted by the progress use case.
export type WordPracticeDecision =
  | 'skip-new'
  | 'start-learning'
  | 'keep-learning'
  | 'mark-learned'
  | 'remember-review'
  | 'forget-review';
