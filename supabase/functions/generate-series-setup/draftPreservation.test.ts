import { assertEquals } from 'jsr:@std/assert';

import { resolveDraftFields } from './draftPreservation.ts';

// providedRequest is a character-mode request where the learner already filled every field.
const providedRequest = {
  participationMode: 'character' as const,
  title: 'Orbit Letters',
  premise: 'Two pen pals trade messages across a divided space colony.',
  mainCharacters: ['Mara', 'Cole'],
  characterProfiles: [
    {
      id: 'character:mara',
      name: 'Mara',
      description: 'A junior archivist who finds old colony messages.',
    },
    {
      id: 'character:cole',
      name: 'Cole',
      description: 'A patient engineer linked to the divided colony.',
    },
  ],
  userRole: 'Mara, a junior archivist',
};

// modelDraft is a fresh setup the model returned, different from providedRequest.
const modelDraft = {
  title: 'Tidewatch Nights',
  premise: 'A night-shift lighthouse keeper decodes warnings hidden in the tide.',
  mainCharacters: ['Nadia', 'Sam'],
  characterProfiles: [
    {
      id: 'character:nadia',
      name: 'Nadia',
      description: 'A new lighthouse keeper learning the tide warnings.',
    },
    {
      id: 'character:sam',
      name: 'Sam',
      description: 'A coast guard contact who trusts Nadia.',
    },
  ],
  userRole: 'Nadia, the new keeper',
};

Deno.test('full Generate regenerates every field even when all were filled', () => {
  const resolved = resolveDraftFields(
    { ...providedRequest, regenerateField: undefined },
    modelDraft,
  );

  assertEquals(resolved, modelDraft);
});

Deno.test('single-field regeneration replaces only the target and preserves the rest', () => {
  const resolved = resolveDraftFields(
    { ...providedRequest, regenerateField: 'premise' },
    modelDraft,
  );

  assertEquals(resolved, {
    title: providedRequest.title,
    premise: modelDraft.premise,
    mainCharacters: providedRequest.mainCharacters,
    characterProfiles: providedRequest.characterProfiles,
    userRole: providedRequest.userRole,
  });
});

Deno.test('single-field regeneration fills a missing provided field from the model value', () => {
  const resolved = resolveDraftFields(
    {
      participationMode: 'character',
      mainCharacters: [],
      regenerateField: 'title',
    },
    modelDraft,
  );

  // The targeted title takes the model value; the empty provided fields fall back to it too.
  assertEquals(resolved, {
    title: modelDraft.title,
    premise: modelDraft.premise,
    mainCharacters: modelDraft.mainCharacters,
    characterProfiles: modelDraft.characterProfiles,
    userRole: modelDraft.userRole,
  });
});

Deno.test('director mode drops userRole on a full regeneration', () => {
  const resolved = resolveDraftFields(
    {
      participationMode: 'director',
      mainCharacters: providedRequest.mainCharacters,
      title: providedRequest.title,
      premise: providedRequest.premise,
      regenerateField: undefined,
    },
    modelDraft,
  );

  assertEquals(resolved, {
    title: modelDraft.title,
    premise: modelDraft.premise,
    mainCharacters: modelDraft.mainCharacters,
    characterProfiles: modelDraft.characterProfiles,
  });
});
