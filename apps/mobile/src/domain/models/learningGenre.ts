// learningGenres is the approved MVP genre set for server-generated stories.
export const learningGenres: readonly [
  'daily-life',
  'work-it',
  'travel-leisure',
  'short-fiction',
] = [
  'daily-life',
  'work-it',
  'travel-leisure',
  'short-fiction',
] as const;

// LearningGenre is the domain value passed to future story generation requests.
export type LearningGenre = (typeof learningGenres)[number];
