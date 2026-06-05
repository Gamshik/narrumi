import type { SyncMetadata } from './syncMetadata';

// learningSignalKinds are non-punitive vocabulary events used for suggestions.
export const learningSignalKinds: readonly [
  'encountered',
  'selected',
  'translated',
  'understood',
  'used',
  'corrected',
  'resurfaced',
  'stable',
  'pinned',
  'later',
  'known',
] = [
  'encountered',
  'selected',
  'translated',
  'understood',
  'used',
  'corrected',
  'resurfaced',
  'stable',
  'pinned',
  'later',
  'known',
] as const;

// LearningSignalKind narrows vocabulary events to the internal MVP signal set.
export type LearningSignalKind = (typeof learningSignalKinds)[number];

// LearningSignal records a local vocabulary event without review debt or mastery queues.
export type LearningSignal = {
  // id is created locally before any future Supabase sync.
  readonly id: string;
  // wordId links the signal to the bundled Oxford vocabulary item.
  readonly wordId: string;
  // kind records what happened without creating a punitive learning state.
  readonly kind: LearningSignalKind;
  // seriesId links story-specific signals to the owning series when present.
  readonly seriesId?: string;
  // episodeId links context-specific signals to the episode when present.
  readonly episodeId?: string;
  // occurredAt records the learner action time used for future scoring.
  readonly occurredAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};
