// seriesParticipationModes lists the supported ways a learner can influence a series.
export const seriesParticipationModes = ['director', 'character'] as const;

// SeriesParticipationMode controls whether learner input directs events or roleplays a character.
export type SeriesParticipationMode = (typeof seriesParticipationModes)[number];
