import type { SyncMetadata } from './syncMetadata';

// SeriesMemory stores bounded continuity context instead of full episode history.
export type SeriesMemory = {
  // id is the local-first memory record id, normally equal to the owning series id.
  readonly id: string;
  // seriesId links this compact memory to one personal AI series.
  readonly seriesId: string;
  // premise keeps the original story promise available for future episodes.
  readonly premise: string;
  // genre preserves the broad story category used by generation.
  readonly genre: string;
  // tone stores the selected mood or narrative feel.
  readonly tone: string;
  // mainCharacters names recurring characters without storing full transcripts.
  readonly mainCharacters: readonly string[];
  // userRole records who the learner is inside the story when applicable.
  readonly userRole?: string;
  // currentConflict summarizes the active story problem.
  readonly currentConflict?: string;
  // knownFacts keeps validated continuity facts compact and bounded.
  readonly knownFacts: readonly string[];
  // openQuestions lists unresolved story questions for continuation.
  readonly openQuestions: readonly string[];
  // importantObjectsOrLocations keeps recurring story anchors available.
  readonly importantObjectsOrLocations: readonly string[];
  // lastEpisodeSummary is the latest compact summary passed to AI context.
  readonly lastEpisodeSummary?: string;
  // unresolvedCliffhanger stores the active hook for the next episode.
  readonly unresolvedCliffhanger?: string;
  // recurringStoryWordIds records words that may resurface naturally.
  readonly recurringStoryWordIds: readonly string[];
  // updatedAt supports deterministic local/remote conflict handling.
  readonly updatedAt: string;
  // sync stores local dirty metadata without exposing remote transport details.
  readonly sync: SyncMetadata;
};
