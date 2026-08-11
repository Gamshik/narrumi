import {
  findCharacterProfileByName,
  normalizeCharacterProfiles,
  type SeriesCharacterProfile,
} from '@domain/index';

import type { SeriesSetupFormState } from '../../../seriesSetupForm';

// SeriesSetupStep identifies one focused card in the simplified creation flow.
export type SeriesSetupStep =
  | 'participation'
  | 'idea'
  | 'characters'
  | 'title';

// SeriesSetupMemoryItem is one compact, editable reminder from an earlier card.
export type SeriesSetupMemoryItem = {
  // step is the destination reopened when the learner presses this reminder.
  readonly step: SeriesSetupStep;
  // label names the remembered decision category.
  readonly label: string;
  // value is a bounded human-readable summary of the saved choice.
  readonly value: string;
};

// seriesSetupSteps fixes the four-card order without encoding navigation in components.
export const seriesSetupSteps: readonly SeriesSetupStep[] = [
  'participation',
  'idea',
  'characters',
  'title',
];

// getSeriesSetupStepIndex resolves a stable card index for progress and navigation.
export function getSeriesSetupStepIndex(step: SeriesSetupStep): number {
  return seriesSetupSteps.indexOf(step);
}

// getSeriesSetupStepTitle returns the single task owned by each card.
export function getSeriesSetupStepTitle(step: SeriesSetupStep): string {
  if (step === 'participation') {
    return 'How do you want to play?';
  }

  if (step === 'idea') {
    return 'What is your story idea?';
  }

  if (step === 'characters') {
    return 'Who is in your story?';
  }

  return 'Name your series';
}

// getInitialSeriesSetupStep resumes a saved draft at its earliest unfinished card.
export function getInitialSeriesSetupStep(
  form: SeriesSetupFormState,
): SeriesSetupStep {
  if (!form.premise.trim()) {
    return form.title.trim() || form.characterProfiles.length > 0
      ? 'idea'
      : 'participation';
  }

  if (!isCharacterCardComplete(form)) {
    return 'characters';
  }

  return 'title';
}

// isSeriesSetupStepComplete protects forward navigation from missing required data.
export function isSeriesSetupStepComplete(
  form: SeriesSetupFormState,
  step: SeriesSetupStep,
): boolean {
  if (step === 'participation') {
    return true;
  }

  if (step === 'idea') {
    return Boolean(form.premise.trim());
  }

  if (step === 'characters') {
    return isCharacterCardComplete(form);
  }

  return (
    Boolean(form.premise.trim()) &&
    isCharacterCardComplete(form) &&
    Boolean(form.title.trim())
  );
}

// getSeriesSetupMemoryItems returns earlier decisions plus the live first-card choice.
export function getSeriesSetupMemoryItems(
  form: SeriesSetupFormState,
  activeStep: SeriesSetupStep,
): readonly SeriesSetupMemoryItem[] {
  const activeIndex: number = getSeriesSetupStepIndex(activeStep);
  const completedCharacterCount: number = normalizeCharacterProfiles(
    form.characterProfiles,
  ).length;
  const allItems: readonly SeriesSetupMemoryItem[] = [
    {
      step: 'participation',
      label: 'Role',
      value: form.participationMode === 'character' ? 'Character' : 'Producer',
    },
    {
      step: 'idea',
      label: 'Idea',
      value: summarizeText(form.premise, 'Not added'),
    },
    {
      step: 'characters',
      label: 'Cast',
      value:
        form.participationMode === 'character' && form.userRole.trim()
          ? `${completedCharacterCount} · You: ${summarizeText(form.userRole, '')}`
          : `${completedCharacterCount} character${completedCharacterCount === 1 ? '' : 's'}`,
    },
  ];

  return allItems.filter(
    (item: SeriesSetupMemoryItem): boolean =>
      getSeriesSetupStepIndex(item.step) < activeIndex ||
      (activeStep === 'participation' && item.step === 'participation'),
  );
}

// isCharacterCardComplete enforces a stable learner identity in Character mode.
function isCharacterCardComplete(form: SeriesSetupFormState): boolean {
  // characterProfiles contains only canonical named profiles used for role matching.
  const characterProfiles: readonly SeriesCharacterProfile[] =
    normalizeCharacterProfiles(form.characterProfiles);

  if (characterProfiles.length === 0) {
    return false;
  }

  return (
    form.participationMode !== 'character' ||
    Boolean(findCharacterProfileByName(characterProfiles, form.userRole))
  );
}

// summarizeText bounds long answers so the unified setup overview remains scannable.
function summarizeText(value: string, fallback: string): string {
  const normalizedValue: string = value.trim().replace(/\s+/g, ' ') || fallback;
  const maximumLength: number = 42;

  return normalizedValue.length > maximumLength
    ? `${normalizedValue.slice(0, maximumLength - 1)}…`
    : normalizedValue;
}
