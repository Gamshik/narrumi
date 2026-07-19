// Pure setup-draft resolution rules live outside index.ts so Deno tests can
// exercise all replacement permissions without starting the Edge runtime.

// SeriesDraftStrategy identifies how current final setup fields may be used.
export type SeriesDraftStrategy = 'fill-missing' | 'refine' | 'rebuild';

// SetupDraftField identifies one AI-produced final setup value.
export type SetupDraftField =
  | 'title'
  | 'premise'
  | 'characterProfiles'
  | 'userRole';

// CharacterProfile is the normalized recurring-character contract.
export interface CharacterProfile {
  // id is the stable local identity preserved across later episode generation.
  readonly id: string;
  // name is the exact dialogue label used by the story runtime.
  readonly name: string;
  // description gives bounded role and personality context to the model.
  readonly description: string;
}

// DraftRequestFields contains current final fields and the explicit update permission.
export interface DraftRequestFields {
  // strategy decides whether current final fields are fixed, optional foundations, or ignored.
  readonly strategy: SeriesDraftStrategy;
  // participationMode decides whether a learner role may exist.
  readonly participationMode: 'director' | 'character';
  // title is the current visible draft title when one exists.
  readonly title?: string;
  // premise is the current visible story setup when one exists.
  readonly premise?: string;
  // mainCharacters is the legacy name-only input used when profiles are absent.
  readonly mainCharacters: readonly string[];
  // characterProfiles are the current editable cast.
  readonly characterProfiles: readonly CharacterProfile[];
  // userRole is the current learner character in character mode.
  readonly userRole?: string;
  // preferredCastSize is the requested final cast size when explicitly selected.
  readonly preferredCastSize?: 1 | 2 | 3 | 4;
  // emptyCharacterSlotCount keeps blank visible editor rows as required AI additions.
  readonly emptyCharacterSlotCount?: number;
}

// ModelDraftFields contains optional replacement decisions from untrusted model output.
export interface ModelDraftFields {
  // title is omitted in refine mode when the current title needs no improvement.
  readonly title?: string;
  // premise is omitted in refine mode when the current premise needs no improvement.
  readonly premise?: string;
  // characterProfiles is omitted when the current cast should remain unchanged.
  readonly characterProfiles?: readonly CharacterProfile[];
  // userRole is omitted when the current learner role should remain unchanged.
  readonly userRole?: string;
}

// ResolvedDraftFields is the assembled setup plus actual AI-changed field provenance.
export interface ResolvedDraftFields {
  // title is preserved, selectively refined, or rebuilt according to strategy.
  readonly title?: string;
  // premise is preserved, selectively refined, or rebuilt according to strategy.
  readonly premise?: string;
  // mainCharacters is derived from the canonical profile list.
  readonly mainCharacters: readonly string[];
  // characterProfiles is the resolved recurring cast.
  readonly characterProfiles: readonly CharacterProfile[];
  // userRole exists only in character mode.
  readonly userRole?: string;
  // changedFields lists only values whose resolved content differs from the visible input.
  readonly changedFields: readonly SetupDraftField[];
}

// CastSizeConstraint defines either one exact cast size or an AI-choice range.
export interface CastSizeConstraint {
  // exact is present when the selected numeric preference must win exactly.
  readonly exact?: number;
  // minimum bounds AI choice while honoring visible blank fill requests.
  readonly minimum: number;
  // maximum keeps AI-selected casts bounded unless visible rows require more.
  readonly maximum: number;
}

// resolveDraftFields enforces each strategy independently from prompt compliance.
export function resolveDraftFields(
  request: DraftRequestFields,
  draft: ModelDraftFields,
): ResolvedDraftFields {
  const providedProfiles = getProvidedCharacterProfiles(request);
  const title = resolveTextField(request.strategy, request.title, draft.title);
  const premise = resolveTextField(
    request.strategy,
    request.premise,
    draft.premise,
  );
  const characterProfiles = resolveCharacterProfiles(
    request,
    providedProfiles,
    draft.characterProfiles,
  );
  const resolvedUserRole = resolveTextField(
    request.strategy,
    request.userRole,
    draft.userRole,
  );
  const userRole =
    request.participationMode === 'character' ? resolvedUserRole : undefined;
  const changedFields = collectChangedFields({
    request,
    providedProfiles,
    title,
    premise,
    characterProfiles,
    userRole,
  });

  return {
    ...(title !== undefined ? { title } : {}),
    ...(premise !== undefined ? { premise } : {}),
    mainCharacters: characterProfiles.map((profile) => profile.name),
    characterProfiles,
    ...(userRole !== undefined ? { userRole } : {}),
    changedFields,
  };
}

// shouldEvaluateSetupField reports whether the model must fill or may reconsider a field.
export function shouldEvaluateSetupField(
  request: DraftRequestFields,
  field: SetupDraftField,
): boolean {
  if (field === 'userRole' && request.participationMode === 'director') {
    return false;
  }

  if (request.strategy !== 'fill-missing') {
    return true;
  }

  if (field === 'title') {
    return request.title === undefined;
  }

  if (field === 'premise') {
    return request.premise === undefined;
  }

  if (field === 'userRole') {
    return request.userRole === undefined;
  }

  const providedProfiles = getProvidedCharacterProfiles(request);
  const emptyCharacterSlotCount = request.emptyCharacterSlotCount ?? 0;

  return (
    emptyCharacterSlotCount > 0 ||
    (request.preferredCastSize !== undefined &&
      providedProfiles.length < request.preferredCastSize) ||
    (request.preferredCastSize === undefined && providedProfiles.length < 4)
  );
}

// getProvidedCharacterProfiles normalizes the legacy name-only input into profiles.
export function getProvidedCharacterProfiles(
  request: Pick<DraftRequestFields, 'characterProfiles' | 'mainCharacters'>,
): readonly CharacterProfile[] {
  if (request.characterProfiles.length > 0) {
    return request.characterProfiles;
  }

  return request.mainCharacters.map((name, index) => ({
    id: createCharacterProfileId(name, index),
    name,
    description: '',
  }));
}

// getCastSizeConstraint resolves strategy permissions against the selected cast control.
export function getCastSizeConstraint(
  request: DraftRequestFields,
): CastSizeConstraint {
  const providedCount = getProvidedCharacterProfiles(request).length;
  const emptyCharacterSlotCount = request.emptyCharacterSlotCount ?? 0;
  const visibleSlotCount = providedCount + emptyCharacterSlotCount;

  if (request.preferredCastSize !== undefined) {
    const exact = request.strategy === 'fill-missing'
      ? Math.max(request.preferredCastSize, visibleSlotCount)
      : request.preferredCastSize;

    return { exact, minimum: exact, maximum: exact };
  }

  if (request.strategy === 'fill-missing') {
    const minimum = Math.max(
      emptyCharacterSlotCount > 0
        ? visibleSlotCount
        : Math.min(providedCount + 1, 4),
      1,
    );

    return { minimum, maximum: Math.max(minimum, 4) };
  }

  if (request.strategy === 'refine') {
    const minimum = emptyCharacterSlotCount > 0 ? visibleSlotCount : 1;

    return { minimum, maximum: Math.max(minimum, 4) };
  }

  return { minimum: 1, maximum: 4 };
}

// createCharacterProfileId produces a deterministic fallback id from a character name.
export function createCharacterProfileId(name: string, index: number): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `character:${slug || `profile-${index + 1}`}`;
}

// resolveTextField applies fixed, discretionary, or replacement semantics.
function resolveTextField(
  strategy: SeriesDraftStrategy,
  provided: string | undefined,
  generated: string | undefined,
): string | undefined {
  if (strategy === 'fill-missing') {
    return provided ?? generated;
  }

  if (strategy === 'refine') {
    return generated ?? provided;
  }

  return generated;
}

// resolveCharacterProfiles preserves, selectively replaces, or rebuilds the cast.
function resolveCharacterProfiles(
  request: DraftRequestFields,
  providedProfiles: readonly CharacterProfile[],
  generatedProfiles: readonly CharacterProfile[] | undefined,
): readonly CharacterProfile[] {
  if (request.strategy === 'fill-missing') {
    return supplementFixedProfiles(
      providedProfiles,
      generatedProfiles ?? [],
      request.preferredCastSize,
      request.emptyCharacterSlotCount ?? 0,
    );
  }

  if (request.strategy === 'refine' && generatedProfiles === undefined) {
    return providedProfiles;
  }

  const distinctGeneratedProfiles = excludePinnedAndDuplicateProfiles(
    generatedProfiles ?? [],
    [],
  );

  const requestedSize = request.preferredCastSize;

  return requestedSize === undefined
    ? distinctGeneratedProfiles
    : distinctGeneratedProfiles.slice(0, requestedSize);
}

// supplementFixedProfiles appends only missing distinct cast slots in fill-missing mode.
function supplementFixedProfiles(
  providedProfiles: readonly CharacterProfile[],
  generatedProfiles: readonly CharacterProfile[],
  preferredCastSize: 1 | 2 | 3 | 4 | undefined,
  emptyCharacterSlotCount: number,
): readonly CharacterProfile[] {
  const distinctGeneratedProfiles = excludePinnedAndDuplicateProfiles(
    generatedProfiles,
    providedProfiles,
  );

  if (providedProfiles.length > 0) {
    const additionsNeeded = preferredCastSize === undefined
      ? distinctGeneratedProfiles.length
      : Math.max(
          preferredCastSize,
          providedProfiles.length + emptyCharacterSlotCount,
        ) - providedProfiles.length;

    return [
      ...providedProfiles,
      ...distinctGeneratedProfiles.slice(
        0,
        Math.min(additionsNeeded, 8 - providedProfiles.length),
      ),
    ];
  }

  return preferredCastSize === undefined
    ? distinctGeneratedProfiles
    : distinctGeneratedProfiles.slice(
        0,
        Math.max(preferredCastSize, emptyCharacterSlotCount),
      );
}

// collectChangedFields compares final values with the visible pre-generation draft.
function collectChangedFields({
  request,
  providedProfiles,
  title,
  premise,
  characterProfiles,
  userRole,
}: {
  // request contains current scalar fields and participation mode.
  readonly request: DraftRequestFields;
  // providedProfiles is the canonical current cast used for equality checks.
  readonly providedProfiles: readonly CharacterProfile[];
  // title is the resolved visible title.
  readonly title: string | undefined;
  // premise is the resolved visible premise.
  readonly premise: string | undefined;
  // characterProfiles is the resolved visible cast.
  readonly characterProfiles: readonly CharacterProfile[];
  // userRole is the resolved learner role when applicable.
  readonly userRole: string | undefined;
}): readonly SetupDraftField[] {
  const changedFields: SetupDraftField[] = [];

  if (title !== request.title) {
    changedFields.push('title');
  }

  if (premise !== request.premise) {
    changedFields.push('premise');
  }

  if (!areCharacterProfilesEqual(characterProfiles, providedProfiles)) {
    changedFields.push('characterProfiles');
  }

  if (
    request.participationMode === 'character' &&
    userRole !== request.userRole
  ) {
    changedFields.push('userRole');
  }

  return changedFields;
}

// areCharacterProfilesEqual performs stable structural comparison for provenance.
function areCharacterProfilesEqual(
  first: readonly CharacterProfile[],
  second: readonly CharacterProfile[],
): boolean {
  return (
    first.length === second.length &&
    first.every((profile, index) => {
      const other = second[index];

      return (
        other !== undefined &&
        profile.id === other.id &&
        profile.name === other.name &&
        profile.description === other.description
      );
    })
  );
}

// excludePinnedAndDuplicateProfiles removes duplicate dialogue names from model output.
function excludePinnedAndDuplicateProfiles(
  generatedProfiles: readonly CharacterProfile[],
  pinnedProfiles: readonly CharacterProfile[],
): readonly CharacterProfile[] {
  const seenNames = new Set(
    pinnedProfiles.map((profile) => normalizeProfileName(profile.name)),
  );

  return generatedProfiles.filter((profile) => {
    const normalizedName = normalizeProfileName(profile.name);

    if (seenNames.has(normalizedName)) {
      return false;
    }

    seenNames.add(normalizedName);
    return true;
  });
}

// normalizeProfileName makes duplicate checks insensitive to case and whitespace.
function normalizeProfileName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
