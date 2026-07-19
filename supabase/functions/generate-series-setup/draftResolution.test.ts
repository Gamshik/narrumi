import { assertEquals } from 'jsr:@std/assert';

import {
  getCastSizeConstraint,
  resolveDraftFields,
  shouldEvaluateSetupField,
} from './draftResolution.ts';

// providedProfiles are current draft characters used by strategy tests.
const providedProfiles = [
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
] as const;

// modelDraft is deliberately different so every authorized replacement is visible.
const modelDraft = {
  title: 'Tidewatch Nights',
  premise: 'A night-shift lighthouse keeper decodes warnings hidden in the tide.',
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
  userRole: 'Nadia',
} as const;

// fourProfiles reproduces the reported cast-reduction scenario.
const fourProfiles = [
  ...providedProfiles,
  ...modelDraft.characterProfiles,
] as const;

Deno.test('fill-missing preserves an explicitly complete final draft', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'fill-missing',
      participationMode: 'character',
      title: 'Orbit Letters',
      premise: 'Two pen pals trade messages across a divided space colony.',
      mainCharacters: providedProfiles.map((profile) => profile.name),
      characterProfiles: providedProfiles,
      userRole: 'Mara',
      preferredCastSize: 2,
    },
    modelDraft,
  );

  assertEquals(resolved, {
    title: 'Orbit Letters',
    premise: 'Two pen pals trade messages across a divided space colony.',
    mainCharacters: ['Mara', 'Cole'],
    characterProfiles: providedProfiles,
    userRole: 'Mara',
    changedFields: [],
  });
});

Deno.test('fill-missing supplies only absent required values', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'fill-missing',
      participationMode: 'character',
      premise: 'The learner joins a coastal rescue team.',
      mainCharacters: [],
      characterProfiles: [],
    },
    modelDraft,
  );

  assertEquals(resolved.title, modelDraft.title);
  assertEquals(resolved.premise, 'The learner joins a coastal rescue team.');
  assertEquals(resolved.userRole, 'Nadia');
  assertEquals(resolved.changedFields, [
    'title',
    'characterProfiles',
    'userRole',
  ]);
});

Deno.test('fill-missing supplements a pinned cast without rewriting it', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'fill-missing',
      participationMode: 'director',
      mainCharacters: ['Mara'],
      characterProfiles: [providedProfiles[0]],
      preferredCastSize: 3,
    },
    {
      characterProfiles: [
        {
          id: 'model:mara',
          name: 'Mara',
          description: 'A rewrite that must be ignored.',
        },
        ...modelDraft.characterProfiles,
      ],
    },
  );

  assertEquals(resolved.characterProfiles, [
    providedProfiles[0],
    modelDraft.characterProfiles[0],
    modelDraft.characterProfiles[1],
  ]);
  assertEquals(resolved.changedFields, ['characterProfiles']);
});

Deno.test('fill-missing preserves and fills every visible empty character row', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'fill-missing',
      participationMode: 'director',
      mainCharacters: ['Mara'],
      characterProfiles: [providedProfiles[0]],
      emptyCharacterSlotCount: 1,
    },
    { characterProfiles: [modelDraft.characterProfiles[0]] },
  );

  assertEquals(resolved.characterProfiles, [
    providedProfiles[0],
    modelDraft.characterProfiles[0],
  ]);
  assertEquals(resolved.changedFields, ['characterProfiles']);
});

Deno.test('fill-missing lets AI choose additions for an existing cast', () => {
  const request = {
    strategy: 'fill-missing' as const,
    participationMode: 'director' as const,
    mainCharacters: ['Mara'],
    characterProfiles: [providedProfiles[0]],
  };
  const resolved = resolveDraftFields(request, {
    characterProfiles: modelDraft.characterProfiles,
  });

  assertEquals(shouldEvaluateSetupField(request, 'characterProfiles'), true);
  assertEquals(resolved.characterProfiles, [
    providedProfiles[0],
    ...modelDraft.characterProfiles,
  ]);
});

Deno.test('refine applies only replacements the model elects to return', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'refine',
      participationMode: 'character',
      title: 'Orbit Letters',
      premise: 'Two pen pals trade messages across a divided space colony.',
      mainCharacters: providedProfiles.map((profile) => profile.name),
      characterProfiles: providedProfiles,
      userRole: 'Mara',
    },
    { title: modelDraft.title },
  );

  assertEquals(resolved.title, modelDraft.title);
  assertEquals(resolved.premise, 'Two pen pals trade messages across a divided space colony.');
  assertEquals(resolved.characterProfiles, providedProfiles);
  assertEquals(resolved.userRole, 'Mara');
  assertEquals(resolved.changedFields, ['title']);
});

Deno.test('refine treats a visible empty character row as required work', () => {
  const request = {
    strategy: 'refine' as const,
    participationMode: 'director' as const,
    mainCharacters: ['Mara'],
    characterProfiles: [providedProfiles[0]],
    emptyCharacterSlotCount: 1,
  };
  const resolved = resolveDraftFields(request, {
    characterProfiles: modelDraft.characterProfiles,
  });

  assertEquals(shouldEvaluateSetupField(request, 'characterProfiles'), true);
  assertEquals(resolved.characterProfiles, modelDraft.characterProfiles);
});

Deno.test('refine enforces a selected smaller cast instead of preserving all profiles', () => {
  const request = {
    strategy: 'refine' as const,
    participationMode: 'director' as const,
    mainCharacters: fourProfiles.map((profile) => profile.name),
    characterProfiles: fourProfiles,
    preferredCastSize: 1 as const,
  };
  const resolved = resolveDraftFields(request, {
    characterProfiles: [providedProfiles[0]],
  });

  assertEquals(getCastSizeConstraint(request), {
    exact: 1,
    minimum: 1,
    maximum: 1,
  });
  assertEquals(resolved.characterProfiles, [providedProfiles[0]]);
  assertEquals(resolved.changedFields, ['characterProfiles']);
});

Deno.test('fill-missing never removes completed profiles for a smaller cast selection', () => {
  const request = {
    strategy: 'fill-missing' as const,
    participationMode: 'director' as const,
    mainCharacters: fourProfiles.map((profile) => profile.name),
    characterProfiles: fourProfiles,
    preferredCastSize: 1 as const,
  };

  assertEquals(getCastSizeConstraint(request), {
    exact: 4,
    minimum: 4,
    maximum: 4,
  });
  assertEquals(resolveDraftFields(request, {}).characterProfiles, fourProfiles);
});

Deno.test('AI-chosen refine may reduce or expand a complete cast', () => {
  const request = {
    strategy: 'refine' as const,
    participationMode: 'director' as const,
    mainCharacters: fourProfiles.map((profile) => profile.name),
    characterProfiles: fourProfiles,
  };

  assertEquals(getCastSizeConstraint(request), {
    minimum: 1,
    maximum: 4,
  });
});

Deno.test('refine may keep every strong existing field unchanged', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'refine',
      participationMode: 'director',
      title: 'Orbit Letters',
      premise: 'Two pen pals trade messages across a divided space colony.',
      mainCharacters: providedProfiles.map((profile) => profile.name),
      characterProfiles: providedProfiles,
    },
    {},
  );

  assertEquals(resolved.changedFields, []);
  assertEquals(resolved.characterProfiles, providedProfiles);
});

Deno.test('rebuild ignores every current final field', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'rebuild',
      participationMode: 'character',
      title: 'Orbit Letters',
      premise: 'Two pen pals trade messages across a divided space colony.',
      mainCharacters: providedProfiles.map((profile) => profile.name),
      characterProfiles: providedProfiles,
      userRole: 'Mara',
    },
    modelDraft,
  );

  assertEquals(resolved.title, modelDraft.title);
  assertEquals(resolved.premise, modelDraft.premise);
  assertEquals(resolved.characterProfiles, modelDraft.characterProfiles);
  assertEquals(resolved.userRole, 'Nadia');
  assertEquals(resolved.changedFields, [
    'title',
    'premise',
    'characterProfiles',
    'userRole',
  ]);
});

Deno.test('director mode always omits userRole', () => {
  const resolved = resolveDraftFields(
    {
      strategy: 'rebuild',
      participationMode: 'director',
      mainCharacters: [],
      characterProfiles: [],
      userRole: 'Mara',
    },
    modelDraft,
  );

  assertEquals(resolved.userRole, undefined);
  assertEquals(resolved.changedFields.includes('userRole'), false);
});

Deno.test('strategy controls which fields the model evaluates', () => {
  const fillRequest = {
    strategy: 'fill-missing' as const,
    participationMode: 'character' as const,
    title: 'Orbit Letters',
    mainCharacters: ['Mara'],
    characterProfiles: [providedProfiles[0]],
    userRole: 'Mara',
    preferredCastSize: 2 as const,
  };
  const refineRequest = { ...fillRequest, strategy: 'refine' as const };

  assertEquals(shouldEvaluateSetupField(fillRequest, 'title'), false);
  assertEquals(shouldEvaluateSetupField(fillRequest, 'premise'), true);
  assertEquals(shouldEvaluateSetupField(fillRequest, 'characterProfiles'), true);
  assertEquals(shouldEvaluateSetupField(fillRequest, 'userRole'), false);
  assertEquals(shouldEvaluateSetupField(refineRequest, 'title'), true);
  assertEquals(shouldEvaluateSetupField(refineRequest, 'userRole'), true);
});
