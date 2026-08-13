import type { CefrLevel, LearningGenre } from '@domain/index';

import { episodeGenreLabels } from '../../episodeSetupOptions';

// episodeSetupSteps is the complete ordered preparation path for one episode.
export const episodeSetupSteps: readonly EpisodeSetupStep[] = [
  'details',
  'words',
];

// EpisodeSetupStep identifies one focused preparation task.
export type EpisodeSetupStep = 'details' | 'words';

// EpisodeSetupSummaryItem describes one answer chip that reopens its source step.
export type EpisodeSetupSummaryItem = {
  // label names the setting for assistive technology and compact visual context.
  readonly label: string;
  // value is the user-facing selected setting.
  readonly value: string;
};

// getEpisodeSetupStepIndex resolves stable progress and navigation ordering.
export function getEpisodeSetupStepIndex(step: EpisodeSetupStep): number {
  return episodeSetupSteps.indexOf(step);
}

// canNavigateToEpisodeSetupStep prevents skipping into an unvisited task.
export function canNavigateToEpisodeSetupStep(
  step: EpisodeSetupStep,
  furthestIndex: number,
): boolean {
  return getEpisodeSetupStepIndex(step) <= furthestIndex;
}

// getEpisodeSetupSummaryItems formats the selected episode direction for the Words step.
export function getEpisodeSetupSummaryItems(
  cefrLevel: CefrLevel | undefined,
  genre: LearningGenre | undefined,
): readonly EpisodeSetupSummaryItem[] {
  const items: EpisodeSetupSummaryItem[] = [];

  if (cefrLevel) {
    items.push({ label: 'Level', value: cefrLevel });
  }

  if (genre) {
    items.push({ label: 'Genre', value: episodeGenreLabels[genre] });
  }

  return items;
}
