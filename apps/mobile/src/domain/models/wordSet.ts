import type { SyncMetadata } from './syncMetadata';

// wordSetKinds are the lightweight MVP word group concepts from the PRD.
export const wordSetKinds: readonly [
  'today',
  'episode',
  'series',
  'weak',
  'no-focus',
] = ['today', 'episode', 'series', 'weak', 'no-focus'] as const;

// WordSetKind narrows locally stored word groups to supported MVP concepts.
export type WordSetKind = (typeof wordSetKinds)[number];

// WordSet stores selected Story Words without creating a review backlog.
export type WordSet = {
  // id is created locally before any future Supabase sync.
  readonly id: string;
  // kind identifies whether the words are for today, an episode, a series, or weak signals.
  readonly kind: WordSetKind;
  // seriesId links series-specific and episode-specific sets to their story.
  readonly seriesId?: string;
  // episodeId links episode word sets to one generated learning unit.
  readonly episodeId?: string;
  // dateKey stores YYYY-MM-DD for Today's Words when applicable.
  readonly dateKey?: string;
  // wordIds are bundled Oxford ids selected for this set.
  readonly wordIds: readonly string[];
  // createdAt records local-first creation time.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};
