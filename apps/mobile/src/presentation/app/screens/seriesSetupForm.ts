import {
  createDefaultSeriesCreativeBrief,
  createDefaultSeriesSetupDraftMeta,
  findCharacterProfileByName,
  normalizeCharacterProfiles,
  seriesSetupTextFields,
  type LocalSeriesSetupDraft,
  type Series,
  type SeriesCharacterProfile,
  type SeriesCreativeBrief,
  type SeriesParticipationMode,
  type SeriesSetupDraftMeta,
  type SeriesSetupTextField,
} from '@domain/index';

// SeriesSetupFormState is the shared controlled value for create and pre-episode edit flows.
export type SeriesSetupFormState = {
  // title is the required visible series name.
  readonly title: string;
  // premise is the required bounded generated or learner-authored setup.
  readonly premise: string;
  // participationMode controls whether the learner directs or joins the story.
  readonly participationMode: SeriesParticipationMode;
  // characterProfiles store stable recurring names and concise descriptions.
  readonly characterProfiles: readonly SeriesCharacterProfile[];
  // userRole identifies the learner character when character mode is selected.
  readonly userRole: string;
  // creativeBrief stores exact optional human-authored anchors outside AI output.
  readonly creativeBrief: SeriesCreativeBrief;
  // setupDraftMeta identifies final setup values whose visible content came from AI.
  readonly setupDraftMeta: SeriesSetupDraftMeta;
};

// SeriesSetupFormErrors stores visible validation messages by final setup field.
export type SeriesSetupFormErrors = Partial<
  Record<keyof SeriesSetupFormState | 'mainCharacters', string>
>;

// participationModeLabels keeps setup mode controls concise on mobile.
export const participationModeLabels: Record<SeriesParticipationMode, string> = {
  director: 'Producer',
  character: 'Character',
};

// getSeriesSetupGenerationActionLabel translates strategy and available context into one action.
export function getSeriesSetupGenerationActionLabel(
  form: SeriesSetupFormState,
): string {
  const strategy = form.creativeBrief.draftStrategy;

  if (strategy === 'fill-missing') {
    return 'Fill empty fields';
  }

  if (strategy === 'refine') {
    return 'Refine my draft';
  }

  if (hasCreativeBriefText(form.creativeBrief)) {
    return 'Rebuild from my idea';
  }

  return hasFinalDraftContent(form)
    ? 'Rebuild draft'
    : 'Create something for me';
}

// shouldConfirmSeriesSetupGeneration protects visible final fields from an accidental rebuild.
export function shouldConfirmSeriesSetupGeneration(
  form: SeriesSetupFormState,
): boolean {
  return (
    form.creativeBrief.draftStrategy === 'rebuild' &&
    hasFinalDraftContent(form)
  );
}

// createEmptySeriesSetupForm returns the untouched default for a new local series.
export function createEmptySeriesSetupForm(): SeriesSetupFormState {
  return {
    title: '',
    premise: '',
    participationMode: 'director',
    characterProfiles: [],
    userRole: '',
    creativeBrief: createDefaultSeriesCreativeBrief(),
    setupDraftMeta: createDefaultSeriesSetupDraftMeta(),
  };
}

// createSeriesSetupForm maps a persisted series into the shared editable form.
export function createSeriesSetupForm(series: Series): SeriesSetupFormState {
  return {
    title: series.title,
    premise: series.premise,
    participationMode: series.participationMode,
    characterProfiles: series.characterProfiles,
    userRole: series.userRole ?? '',
    creativeBrief: series.creativeBrief,
    setupDraftMeta: series.setupDraftMeta,
  };
}

// createSeriesSetupFormFromDraft restores every incomplete value without final validation.
export function createSeriesSetupFormFromDraft(
  draft: LocalSeriesSetupDraft,
): SeriesSetupFormState {
  return {
    title: draft.title,
    premise: draft.premise,
    participationMode: draft.participationMode,
    characterProfiles: draft.characterProfiles,
    userRole: draft.userRole,
    creativeBrief: draft.creativeBrief,
    setupDraftMeta: draft.setupDraftMeta,
  };
}

// createSimpleSeriesSetupFormFromDraft migrates an older draft into the four-card flow.
export function createSimpleSeriesSetupFormFromDraft(
  draft: LocalSeriesSetupDraft,
): SeriesSetupFormState {
  const restoredForm: SeriesSetupFormState =
    createSeriesSetupFormFromDraft(draft);
  // premise preserves the learner's old visible draft first, then promotes a legacy idea.
  const premise: string =
    restoredForm.premise.trim() || restoredForm.creativeBrief.idea.trim();

  return {
    ...restoredForm,
    premise,
    // Removed advanced fields must not silently influence the simplified creation flow.
    creativeBrief: createDefaultSeriesCreativeBrief(),
  };
}

// createLocalSeriesSetupDraft captures the controlled form before any online validation.
export function createLocalSeriesSetupDraft(
  form: SeriesSetupFormState,
  draftId: string,
  updatedAt: string,
  seriesId?: string,
): LocalSeriesSetupDraft {
  return {
    draftId,
    ...(seriesId ? { seriesId } : {}),
    ...form,
    updatedAt,
  };
}

// markSetupFieldUserAuthored removes AI provenance as soon as the learner edits a value.
export function markSetupFieldUserAuthored(
  form: SeriesSetupFormState,
  field: SeriesSetupTextField,
): SeriesSetupFormState {
  return {
    ...form,
    setupDraftMeta: {
      aiGeneratedFields: form.setupDraftMeta.aiGeneratedFields.filter(
        (generatedField) => generatedField !== field,
      ),
    },
  };
}

// applyAiGeneratedFields preserves earlier provenance and adds fields changed by the latest AI result.
export function applyAiGeneratedFields(
  form: SeriesSetupFormState,
  generatedFields: readonly SeriesSetupTextField[],
): SeriesSetupFormState {
  return {
    ...form,
    setupDraftMeta: {
      aiGeneratedFields: seriesSetupTextFields.filter((field) =>
        form.setupDraftMeta.aiGeneratedFields.includes(field) ||
        generatedFields.includes(field),
      ),
    },
  };
}

// isAiGeneratedField lets presentation distinguish AI suggestions from learner text.
export function isAiGeneratedField(
  form: SeriesSetupFormState,
  field: SeriesSetupTextField,
): boolean {
  return form.setupDraftMeta.aiGeneratedFields.includes(field);
}

// validateSeriesSetupForm keeps final save requirements separate from optional creative anchors.
export function validateSeriesSetupForm(
  form: SeriesSetupFormState,
): SeriesSetupFormErrors {
  const errors: SeriesSetupFormErrors = {};

  if (!form.title.trim()) {
    errors.title = 'Enter a series title.';
  }

  if (!form.premise.trim()) {
    errors.premise = 'Enter a premise or build from your idea.';
  }

  if (normalizeCharacterProfiles(form.characterProfiles).length === 0) {
    errors.mainCharacters = 'Add a character or build from your idea.';
  }

  if (form.participationMode === 'character' && !form.userRole.trim()) {
    errors.userRole = 'Choose your character role.';
  } else if (
    form.participationMode === 'character' &&
    !findCharacterProfileByName(
      normalizeCharacterProfiles(form.characterProfiles),
      form.userRole,
    )
  ) {
    errors.userRole = 'Use one of the character names above.';
  }

  return errors;
}

// hasCreativeBriefText distinguishes guided rebuilding from a deliberately blank prompt.
function hasCreativeBriefText(brief: SeriesCreativeBrief): boolean {
  return Boolean(
    brief.idea.trim() ||
      brief.worldAndSetting.trim() ||
      brief.backstory.trim() ||
      brief.storyDriver.trim() ||
      brief.mustInclude.trim() ||
      brief.avoid.trim(),
  );
}

// hasFinalDraftContent detects values that rebuild mode would discard from model context.
function hasFinalDraftContent(form: SeriesSetupFormState): boolean {
  return Boolean(
    form.title.trim() ||
      form.premise.trim() ||
      normalizeCharacterProfiles(form.characterProfiles).length > 0 ||
      form.userRole.trim(),
  );
}
