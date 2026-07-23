// learningGenres is the approved episode-level genre set for server-generated stories.
export const learningGenres: readonly [
  'daily-life',
  'comedy',
  'romance',
  'drama',
  'work-it',
  'travel-leisure',
  'cozy-mystery',
  'detective',
  'adventure',
  'thriller',
  'fantasy',
  'science-fiction',
  'short-fiction',
] = [
  'daily-life',
  'comedy',
  'romance',
  'drama',
  'work-it',
  'travel-leisure',
  'cozy-mystery',
  'detective',
  'adventure',
  'thriller',
  'fantasy',
  'science-fiction',
  'short-fiction',
] as const;

// LearningGenre is the episode genre passed to story generation requests.
export type LearningGenre = (typeof learningGenres)[number];

// defaultLearningGenre is the first-episode default independent of legacy preferences.
export const defaultLearningGenre: LearningGenre = learningGenres[0];
