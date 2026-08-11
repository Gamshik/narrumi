import type {
  SeriesSetupDraft,
  SeriesSetupGenerationTarget,
} from '@application/ports';
import type { GenerateSeriesSetupDraftInput } from '@application/useCases';
import {
  characterProfileNames,
  createDefaultSeriesCreativeBrief,
  normalizeCharacterProfiles,
  type SeriesCharacterProfile,
  type SeriesSetupTextField,
} from '@domain/index';
import {
  applyAiGeneratedFields,
  type SeriesSetupFormState,
} from './seriesSetupForm';

// buildSeriesSetupDraftRequest separates completed characters from visible AI-fill slots.
export function buildSeriesSetupDraftRequest(
  form: SeriesSetupFormState,
): GenerateSeriesSetupDraftInput {
  // characterProfiles contains only complete pinned names that AI must preserve in fill mode.
  const characterProfiles: readonly SeriesCharacterProfile[] =
    normalizeCharacterProfiles(form.characterProfiles);
  // emptyCharacterSlotCount keeps blank editor rows meaningful after normalization.
  const emptyCharacterSlotCount: number = form.characterProfiles.filter(
    (profile) => !profile.name.trim(),
  ).length;

  return {
    participationMode: form.participationMode,
    ...(form.title.trim() ? { title: form.title } : {}),
    ...(form.premise.trim() ? { premise: form.premise } : {}),
    mainCharacters: characterProfileNames(characterProfiles),
    characterProfiles,
    emptyCharacterSlotCount,
    creativeBrief: form.creativeBrief,
    ...(form.participationMode === 'character' && form.userRole.trim()
      ? { userRole: form.userRole }
      : {}),
  };
}

// buildTargetedSeriesSetupDraftRequest asks AI to replace only one visible card.
export function buildTargetedSeriesSetupDraftRequest(
  form: SeriesSetupFormState,
  target: SeriesSetupGenerationTarget,
): GenerateSeriesSetupDraftInput {
  // targetForm clears only the requested output while keeping earlier visible answers as context.
  const targetForm: SeriesSetupFormState = {
    ...form,
    ...(target === 'premise' ? { premise: '' } : {}),
    ...(target === 'title' ? { title: '' } : {}),
    ...(target === 'characterProfiles'
      ? { characterProfiles: [], userRole: '' }
      : {}),
    // The simplified flow exposes no advanced anchors or replacement strategies.
    creativeBrief: createDefaultSeriesCreativeBrief(),
  };

  return {
    ...buildSeriesSetupDraftRequest(targetForm),
    generationTarget: target,
  };
}

// applyTargetedSeriesSetupDraft copies only the field requested by the current card.
export function applyTargetedSeriesSetupDraft(
  form: SeriesSetupFormState,
  target: SeriesSetupGenerationTarget,
  draft: SeriesSetupDraft,
): SeriesSetupFormState {
  if (target === 'premise') {
    return applyAiGeneratedFields(
      { ...form, premise: draft.premise },
      ['premise'],
    );
  }

  if (target === 'title') {
    return applyAiGeneratedFields(
      { ...form, title: draft.title },
      ['title'],
    );
  }

  // generatedFields records both the cast and canonical learner identity in Character mode.
  const generatedFields: readonly SeriesSetupTextField[] =
    form.participationMode === 'character'
      ? ['characterProfiles', 'userRole']
      : ['characterProfiles'];

  return applyAiGeneratedFields(
    {
      ...form,
      characterProfiles: draft.characterProfiles,
      userRole:
        form.participationMode === 'character' ? draft.userRole ?? '' : '',
    },
    generatedFields,
  );
}
