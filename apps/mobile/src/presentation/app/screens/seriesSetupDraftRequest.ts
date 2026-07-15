import type { GenerateSeriesSetupDraftInput } from '@application/useCases';
import {
  characterProfileNames,
  normalizeCharacterProfiles,
  type CefrLevel,
  type LearningGenre,
  type SeriesCharacterProfile,
  type SeriesParticipationMode,
} from '@domain/index';

// SeriesSetupDraftFormValue contains the form fields needed by setup generation.
export type SeriesSetupDraftFormValue = {
  // title is optional seed text for setup generation.
  readonly title: string;
  // genre is the user-selected story category.
  readonly genre: LearningGenre;
  // cefrLevel controls generated language difficulty.
  readonly cefrLevel: CefrLevel;
  // tone controls the generated story mood.
  readonly tone: string;
  // premise is optional seed text for setup generation.
  readonly premise: string;
  // participationMode controls whether the learner directs or joins the story.
  readonly participationMode: SeriesParticipationMode;
  // characterProfiles contains both complete and currently empty editor rows.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
  // userRole is optional except when saving a completed character-mode setup.
  readonly userRole: string;
};

// buildSeriesSetupDraftRequest removes incomplete editor rows before crossing the AI boundary.
export function buildSeriesSetupDraftRequest(
  form: SeriesSetupDraftFormValue,
): GenerateSeriesSetupDraftInput {
  // characterProfiles excludes blank UI slots so the server can generate missing characters.
  const characterProfiles: readonly SeriesCharacterProfile[] =
    normalizeCharacterProfiles(form.characterProfiles);

  return {
    genre: form.genre,
    cefrLevel: form.cefrLevel,
    tone: form.tone,
    participationMode: form.participationMode,
    ...(form.title.trim() ? { title: form.title } : {}),
    ...(form.premise.trim() ? { premise: form.premise } : {}),
    mainCharacters: characterProfileNames(characterProfiles),
    characterProfiles,
    ...(form.participationMode === 'character' && form.userRole.trim()
      ? { userRole: form.userRole }
      : {}),
  };
}
