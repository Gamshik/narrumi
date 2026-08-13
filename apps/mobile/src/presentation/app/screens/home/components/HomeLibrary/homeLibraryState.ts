import type { LocalSeriesSetupDraft } from '@domain/index';

import {
  createSimpleSeriesSetupFormFromDraft,
  participationModeLabels,
} from '../../../seriesSetupForm';
import {
  isSeriesSetupStepComplete,
  seriesSetupSteps,
  type SeriesSetupStep,
} from '../CreateSeriesFlow/seriesSetupFlow';

// SeriesDraftSummary contains the bounded copy rendered by the local draft card.
export type SeriesDraftSummary = {
  // completedStepCount reports four-card progress without exposing form validation details.
  readonly completedStepCount: number;
  // modeLabel translates the stored participation value into learner-facing copy.
  readonly modeLabel: string;
  // title provides a stable fallback while the title card is still unfinished.
  readonly title: string;
};

// getSeriesDraftSummary derives presentation copy from the simplified four-card form contract.
export function getSeriesDraftSummary(
  draft: LocalSeriesSetupDraft,
): SeriesDraftSummary {
  // form applies the same legacy-draft migration used when the learner resumes setup.
  const form = createSimpleSeriesSetupFormFromDraft(draft);
  // completedStepCount counts only cards that currently satisfy their forward-navigation rule.
  const completedStepCount: number = seriesSetupSteps.filter(
    // step is one card from the canonical setup order being checked for visible progress.
    (step: SeriesSetupStep): boolean => isSeriesSetupStepComplete(form, step),
  ).length;

  return {
    completedStepCount,
    modeLabel: participationModeLabels[form.participationMode],
    title: form.title.trim() || 'Untitled series',
  };
}
