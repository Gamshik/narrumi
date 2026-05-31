export const learningGenres = [
  'daily-life',
  'work-it',
  'travel-leisure',
  'short-fiction',
] as const;

export type LearningGenre = (typeof learningGenres)[number];
