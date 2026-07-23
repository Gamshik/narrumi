import {
  defaultLearningGenre,
  type CefrLevel,
  type Episode,
  type LearningGenre,
} from '@domain/index';

// episodeGenreLabels maps every domain genre to its compact episode-setup label.
export const episodeGenreLabels: Record<LearningGenre, string> = {
  'daily-life': 'Daily Life',
  comedy: 'Comedy',
  romance: 'Romance',
  drama: 'Drama',
  'work-it': 'Work & IT',
  'travel-leisure': 'Travel',
  'cozy-mystery': 'Cozy Mystery',
  detective: 'Detective',
  adventure: 'Adventure',
  thriller: 'Thriller',
  fantasy: 'Fantasy',
  'science-fiction': 'Sci-Fi',
  'short-fiction': 'Short Fiction',
};

// EpisodeSetupDefaults contains the remembered choices shown before generation.
export type EpisodeSetupDefaults = {
  // cefrLevel comes from the previous episode or settings for the first episode.
  readonly cefrLevel: CefrLevel;
  // genre comes from the previous episode or the first approved genre.
  readonly genre: LearningGenre;
};

// resolveEpisodeSetupDefaults applies the product default and remember-last rules.
export function resolveEpisodeSetupDefaults(
  previousEpisode: Pick<Episode, 'cefrLevel' | 'genre'> | undefined,
  preferredCefrLevel: CefrLevel,
): EpisodeSetupDefaults {
  return {
    cefrLevel: previousEpisode?.cefrLevel ?? preferredCefrLevel,
    genre: previousEpisode?.genre ?? defaultLearningGenre,
  };
}
