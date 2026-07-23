import type { SyncMetadata } from './syncMetadata';
import type { SeriesParticipationMode } from './seriesParticipationMode';
import type { SeriesCharacterProfile } from './seriesCharacter';

// SeriesMemory stores bounded continuity context instead of full episode history.
export type SeriesMemory = {
  // id is the local-first memory record id, normally equal to the owning series id.
  readonly id: string;
  // seriesId links this compact memory to one personal AI series.
  readonly seriesId: string;
  // premise keeps the original story promise available for future episodes.
  readonly premise: string;
  // genre is retained only for backward-compatible stored memory records.
  readonly genre: string;
  // tone is retained only for backward-compatible stored memory records.
  readonly tone: string;
  // participationMode keeps episode prompts consistent after the series begins.
  readonly participationMode: SeriesParticipationMode;
  // mainCharacters names recurring characters without storing full transcripts.
  readonly mainCharacters: readonly string[];
  // characterProfiles pin dialogue names for recurring speakers across episodes.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
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
