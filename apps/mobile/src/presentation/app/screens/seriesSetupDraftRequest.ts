import type { GenerateSeriesSetupDraftInput } from '@application/useCases';
import {
  characterProfileNames,
  normalizeCharacterProfiles,
  type SeriesCharacterProfile,
} from '@domain/index';
import type { SeriesSetupFormState } from './seriesSetupForm';

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
    genre: form.genre,
    cefrLevel: form.cefrLevel,
    tone: form.tone,
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
