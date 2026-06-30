// Pure helper that assembles the final setup draft fields from the request and the
// model output. It lives in its own module (like regeneration.ts) so the preservation
// rules can be unit tested without starting the Edge runtime (index.ts runs
// Deno.serve on import).

// DraftRequestFields is the minimal request shape needed to decide per-field preservation.
export interface DraftRequestFields {
  // participationMode controls whether userRole exists in the final draft.
  readonly participationMode: 'director' | 'character';
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

// resolveDraftFields assembles the generated setup draft. The setup generator has
// one action: regenerate the whole text setup while selected constraints stay fixed.
export function resolveDraftFields(
  request: DraftRequestFields,
  draft: ModelDraftFields,
): ResolvedDraftFields {
  const userRole =
    request.participationMode === 'character'
      ? draft.userRole
      : undefined;

  return {
    ...(draft.title !== undefined ? { title: draft.title } : {}),
    ...(draft.premise !== undefined ? { premise: draft.premise } : {}),
    mainCharacters: draft.mainCharacters,
    characterProfiles: draft.characterProfiles,
    ...(userRole !== undefined ? { userRole } : {}),
  };
}
