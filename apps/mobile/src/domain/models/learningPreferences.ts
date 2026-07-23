import type { CefrLevel } from './cefrLevel';
import type { LearningGenre } from './learningGenre';
import type { SyncMetadata } from './syncMetadata';

// DEFAULT_STORY_WORD_GOAL is the default number of Story Words proposed for an episode.
export const DEFAULT_STORY_WORD_GOAL = 5;

// MIN_STORY_WORD_GOAL is the lower product bound for automatic Story Word picks.
export const MIN_STORY_WORD_GOAL = 0;

// MAX_STORY_WORD_GOAL is the upper product bound before difficulty warnings apply.
export const MAX_STORY_WORD_GOAL = 12;

// LearningPreferences stores local defaults for episode preparation and vocabulary.
export type LearningPreferences = {
  // preferredCefrLevel is the manually selected grammar and vocabulary target.
  readonly preferredCefrLevel: CefrLevel;
  // preferredGenre is retained for sync compatibility; new episodes use their own history.
  readonly preferredGenre: LearningGenre;
  // storyWordGoal controls automatic Word Picker suggestions without hard-blocking the user.
  readonly storyWordGoal: number;
  // updatedAt is retained for future preference sync conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};

// clampStoryWordGoal enforces automatic suggestion bounds without limiting manual selection.
export function clampStoryWordGoal(value: number): number {
  return Math.min(MAX_STORY_WORD_GOAL, Math.max(MIN_STORY_WORD_GOAL, value));
}
