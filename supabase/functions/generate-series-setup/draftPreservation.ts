// Pure helper that assembles the final setup draft fields from the request and the
// model output. It lives in its own module (like regeneration.ts) so the preservation
// rules can be unit tested without starting the Edge runtime (index.ts runs
// Deno.serve on import).

// SetupTextField names the AI-fillable text fields whose preservation this helper decides.
export type SetupTextField = 'premise' | 'mainCharacters' | 'userRole' | 'title';

// DraftRequestFields is the minimal request shape needed to decide per-field preservation.
export interface DraftRequestFields {
  // regenerateField, when set, marks the single field that must take the fresh model value.
  // When absent the learner pressed the full "Generate" action and every field is regenerated.
  readonly regenerateField?: SetupTextField;
  // participationMode controls whether userRole exists in the final draft.
  readonly participationMode: 'director' | 'character';
  // title is the learner-provided title, preserved only during single-field regeneration.
  readonly title?: string;
  // premise is the learner-provided premise, preserved only during single-field regeneration.
  readonly premise?: string;
  // mainCharacters are the learner-provided characters, preserved only during single-field regeneration.
  readonly mainCharacters: readonly string[];
  // characterProfiles are preserved with descriptions during single-field regeneration.
  readonly characterProfiles?: readonly CharacterProfile[];
  // userRole is the learner-provided character-mode role, preserved only during single-field regeneration.
  readonly userRole?: string;
}

// ModelDraftFields is the normalized text the model returned for the draft.
export interface ModelDraftFields {
  readonly title?: string;
  readonly premise?: string;
  readonly mainCharacters: readonly string[];
  readonly characterProfiles: readonly CharacterProfile[];
  readonly userRole?: string;
}

// ResolvedDraftFields is the assembled draft before strict schema validation.
export interface ResolvedDraftFields {
  readonly title?: string;
  readonly premise?: string;
  readonly mainCharacters: readonly string[];
  readonly characterProfiles: readonly CharacterProfile[];
  readonly userRole?: string;
}

// CharacterProfile is the setup draft shape for pinned dialogue labels.
export interface CharacterProfile {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

// resolveDraftFields decides, per field, whether to keep the learner's provided value
// or take the freshly generated model value.
//
// - Full generation (no regenerateField): the learner pressed "Generate", which must
//   regenerate every text field from scratch. Every field takes the model value so
//   already-filled fields are replaced, not preserved.
// - Single-field regeneration (regenerateField set): only the targeted field takes the
//   model value; every other provided field is preserved exactly.
//
// userRole only exists in character mode; director mode always drops it.
export function resolveDraftFields(
  request: DraftRequestFields,
  draft: ModelDraftFields,
): ResolvedDraftFields {
  // isFullRegeneration is true when the learner asked to regenerate the whole setup.
  const isFullRegeneration = request.regenerateField === undefined;

  // shouldPreserve keeps a learner value only outside full regeneration and only for
  // fields that are not the single regeneration target.
  const shouldPreserve = (field: SetupTextField): boolean =>
    !isFullRegeneration && request.regenerateField !== field;

  const title = shouldPreserve('title')
    ? request.title ?? draft.title
    : draft.title;
  const premise = shouldPreserve('premise')
    ? request.premise ?? draft.premise
    : draft.premise;
  const mainCharacters =
    shouldPreserve('mainCharacters') && request.mainCharacters.length > 0
      ? request.mainCharacters
      : draft.mainCharacters;
  const characterProfiles =
    shouldPreserve('mainCharacters') && request.mainCharacters.length > 0
      ? request.characterProfiles?.length
        ? request.characterProfiles
        : request.mainCharacters.map(createCharacterProfile)
      : draft.characterProfiles;
  const userRole =
    request.participationMode === 'character'
      ? shouldPreserve('userRole')
        ? request.userRole ?? draft.userRole
        : draft.userRole
      : undefined;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(premise !== undefined ? { premise } : {}),
    mainCharacters,
    characterProfiles,
    ...(userRole !== undefined ? { userRole } : {}),
  };
}

// createCharacterProfile preserves legacy character names when profiles were not sent.
function createCharacterProfile(name: string, index: number): CharacterProfile {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return {
    id: `character:${slug || `profile-${index + 1}`}`,
    name,
    description: name,
  };
}
