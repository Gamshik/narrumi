import type { CefrLevel } from './cefrLevel';
import type { LearningGenre } from './learningGenre';
import type { SyncMetadata } from './syncMetadata';

// DEFAULT_STORY_WORD_GOAL is the default number of Story Words proposed for an episode.
export const DEFAULT_STORY_WORD_GOAL = 5;

// MIN_STORY_WORD_GOAL is the lower product bound for automatic Story Word picks.
export const MIN_STORY_WORD_GOAL = 0;

// MAX_STORY_WORD_GOAL is the upper product bound before difficulty warnings apply.
export const MAX_STORY_WORD_GOAL = 12;

// DEFAULT_EPISODE_WORD_COUNT is the MVP target length for generated episodes.
export const DEFAULT_EPISODE_WORD_COUNT = 140;

// MIN_EPISODE_WORD_COUNT is the lower PRD bound for initial episode content.
export const MIN_EPISODE_WORD_COUNT = 100;

// MAX_EPISODE_WORD_COUNT is the upper PRD bound for initial episode content.
export const MAX_EPISODE_WORD_COUNT = 180;

// LearningPreferences stores local defaults for series and episode generation.
export type LearningPreferences = {
  // preferredCefrLevel is the manually selected grammar and vocabulary target.
  readonly preferredCefrLevel: CefrLevel;
  // preferredGenre is the default genre offered during series creation.
  readonly preferredGenre: LearningGenre;
  // storyWordGoal controls automatic Word Picker suggestions without hard-blocking the user.
  readonly storyWordGoal: number;
  // episodeWordCount stores the target 100-180 word episode length.
  readonly episodeWordCount: number;
  // updatedAt is retained for future preference sync conflict handling.
  readonly updatedAt: string;
  // sync stores dirty state for future Supabase reconciliation.
  readonly sync: SyncMetadata;
};

// clampStoryWordGoal enforces automatic suggestion bounds without limiting manual selection.
export function clampStoryWordGoal(value: number): number {
  return Math.min(MAX_STORY_WORD_GOAL, Math.max(MIN_STORY_WORD_GOAL, value));
}

// clampEpisodeWordCount enforces the MVP episode length target range.
export function clampEpisodeWordCount(value: number): number {
  return Math.min(MAX_EPISODE_WORD_COUNT, Math.max(MIN_EPISODE_WORD_COUNT, value));
}
