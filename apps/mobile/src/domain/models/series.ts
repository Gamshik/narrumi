import type { CefrLevel } from './cefrLevel';
import type { LearningGenre } from './learningGenre';
import type { SeriesMemory } from './seriesMemory';
import type { SyncMetadata } from './syncMetadata';

// Series is the continuity root for a user's personal English story.
export type Series = {
  // id is created locally before any future Supabase sync.
  readonly id: string;
  // ownerId is present after authentication and must match remote ownership.
  readonly ownerId?: string;
  // title is the user's visible name for the personal series.
  readonly title: string;
  // genre is the approved broad genre used by generation and suggestions.
  readonly genre: LearningGenre;
  // cefrLevel controls grammar and vocabulary difficulty.
  readonly cefrLevel: CefrLevel;
  // tone stores the selected story mood.
  readonly tone: string;
  // premise stores the original story setup in bounded form.
  readonly premise: string;
  // mainCharacters names recurring characters or the user's role context.
  readonly mainCharacters: readonly string[];
  // userRole records who the learner is inside the story when applicable.
  readonly userRole?: string;
  // memory is compact context and must never become unbounded episode history.
  readonly memory: SeriesMemory;
  // createdAt records local-first creation time.
  readonly createdAt: string;
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};
