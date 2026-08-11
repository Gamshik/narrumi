import { z } from 'npm:zod@4.4.3';

import {
  corsHeaders,
  generationStateResponse,
  jsonResponse,
  logSafeError,
  logSafeWarning,
  moderationResponse,
  safeErrorResponse,
} from '../_shared/http.ts';
import { runIdempotentGeneration } from '../_shared/generationIdempotency.ts';
import { readAuthenticatedUserId } from '../_shared/auth.ts';
import {
  createCharacterProfileId,
  type DraftRequestFields,
  getCastSizeConstraint,
  getProvidedCharacterProfiles,
  resolveDraftFields,
  type SetupDraftField,
  shouldEvaluateSetupField,
} from './draftResolution.ts';
import { getSetupGenerationTargetPolicy } from './generationTargetPolicy.ts';
import {
  buildModerationReview,
  collectModerationEntries,
  createModerationStore,
  getEffectiveWarningCount,
  scanModerationEntries,
} from '../_shared/moderation.ts';
import {
  generateStructuredObject,
  getAiModelId,
  isAiGatewayConfigured,
} from '../_shared/aiGateway.ts';
import {
  generateQualityAcceptedCandidate,
  type QualityReview,
  reviewGeneratedCandidate,
} from '../_shared/aiQuality.ts';

// writerModel is logged without exposing prompts or server secrets.
const writerModel: string = getAiModelId('writer');

// setupTextFields lists AI-fillable result fields in their dependency order.
const setupTextFields = [
  'premise',
  'characterProfiles',
  'userRole',
  'title',
] as const satisfies readonly SetupDraftField[];

// characterProfileSchema validates recurring-character input at the trust boundary.
const characterProfileSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
});

// creativeBriefSchema bounds all optional human-authored story anchors.
const creativeBriefSchema = z.object({
  idea: z.string().trim().max(1000),
  worldAndSetting: z.string().trim().max(400),
  backstory: z.string().trim().max(600),
  storyDriver: z.string().trim().max(500),
  mustInclude: z.string().trim().max(300),
  avoid: z.string().trim().max(300),
  preferredCastSize: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]).optional(),
  draftStrategy: z.enum(['fill-missing', 'refine', 'rebuild']),
});

// setupDraftFieldSchema validates actual changed-field provenance in responses.
const setupDraftFieldSchema = z.enum([
  'title',
  'premise',
  'characterProfiles',
  'userRole',
]);

// setupDraftRequestSchema validates selected constraints and optional user text.
const setupDraftRequestSchema = z.object({
  generationRequestId: z.string().trim().min(1).max(240),
  generationTarget: z.enum(['premise', 'characterProfiles', 'title']).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  participationMode: z.enum(['director', 'character']),
  premise: z.string().trim().min(1).max(1000).optional(),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).max(8),
  characterProfiles: z.array(characterProfileSchema).max(8).default([]),
  emptyCharacterSlotCount: z.number().int().min(0).max(8).default(0),
  userRole: z.string().trim().min(1).max(160).optional(),
  creativeBrief: creativeBriefSchema,
}).superRefine((request, context) => {
  const providedNames = request.characterProfiles.length > 0
    ? request.characterProfiles.map((profile) => profile.name)
    : request.mainCharacters;
  const normalizedProvidedNames = providedNames.map(normalizeCharacterName);

  if (new Set(normalizedProvidedNames).size !== providedNames.length) {
    context.addIssue({
      code: 'custom',
      message: 'Character profile names must be unique.',
      path: ['characterProfiles'],
    });
  }

  if (
    providedNames.length + request.emptyCharacterSlotCount > 8
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Completed and empty character rows must not exceed eight.',
      path: ['emptyCharacterSlotCount'],
    });
  }

  const pinsRole = request.creativeBrief.draftStrategy === 'fill-missing' &&
    request.participationMode === 'character' &&
    request.userRole !== undefined;
  const pinsProfiles = request.creativeBrief.draftStrategy === 'fill-missing' &&
    providedNames.length > 0;

  if (
    pinsRole &&
    pinsProfiles &&
    request.userRole !== undefined &&
    !providedNames.includes(request.userRole)
  ) {
    context.addIssue({
      code: 'custom',
      message:
        'A preserved userRole must match a preserved character profile name.',
      path: ['userRole'],
    });
  }
});

// setupDraftSchema is the complete text setup returned to the mobile form.
const setupDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  premise: z.string().trim().min(1).max(1000),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).min(1).max(8),
  characterProfiles: z.array(characterProfileSchema).min(1).max(8),
  userRole: z.string().trim().min(1).max(160).optional(),
  changedFields: z.array(setupDraftFieldSchema).max(4),
}).superRefine((draft, context) => {
  const profileNames = draft.characterProfiles.map((profile) => profile.name);

  if (
    draft.mainCharacters.length !== profileNames.length ||
    draft.mainCharacters.some((name, index) => name !== profileNames[index])
  ) {
    context.addIssue({
      code: 'custom',
      message: 'mainCharacters must exactly match characterProfiles names.',
      path: ['mainCharacters'],
    });
  }

  if (
    new Set(profileNames.map(normalizeCharacterName)).size !==
      profileNames.length
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Character profile names must be unique.',
      path: ['characterProfiles'],
    });
  }

  if (draft.userRole !== undefined && !profileNames.includes(draft.userRole)) {
    context.addIssue({
      code: 'custom',
      message: 'userRole must exactly match one character profile name.',
      path: ['userRole'],
    });
  }
});

// SetupDraftRequest is the parsed Edge request contract.
type SetupDraftRequest = z.infer<typeof setupDraftRequestSchema>;

// SetupDraft is the validated complete setup response.
type SetupDraft = z.infer<typeof setupDraftSchema>;

// modelSetupDraftSchema leniently parses raw model output so imperfect non-target
// fields never throw before finalizeDraft assembles the final draft. Empty strings
// and missing fields are normalized to undefined; the strict setupDraftSchema runs
// only after preservation, so the model just has to get the regenerated field right.
const modelSetupDraftSchema = z
  .object({
    // nullish() tolerates both missing fields and explicit null, which models emit
    // for omitted text (e.g. userRole: null in director mode); they normalize below.
    title: z.string().trim().max(160).nullish(),
    premise: z.string().trim().max(1000).nullish(),
    characterProfiles: z
      .array(
        z
          .object({
            id: z.string().trim().max(120).nullish(),
            name: z.string().trim().max(80).nullish(),
            description: z.string().trim().max(300).nullish(),
          })
          .nullish(),
      )
      .max(8)
      .nullish(),
    userRole: z.string().trim().max(160).nullish(),
  })
  .transform((draft) => ({
    title: draft.title ? draft.title : undefined,
    premise: draft.premise ? draft.premise : undefined,
    characterProfiles:
      draft.characterProfiles === null || draft.characterProfiles === undefined
        ? undefined
        : draft.characterProfiles.flatMap((profile, index) => {
          if (!profile?.name) {
            return [];
          }

          const name = profile.name;

          return [
            {
              id: profile.id || createCharacterProfileId(name, index),
              name,
              description: profile.description ?? '',
            },
          ];
        }),
    userRole: draft.userRole ? draft.userRole : undefined,
  }));

// ModelSetupDraft is the normalized, not-yet-validated text returned by the model.
type ModelSetupDraft = z.infer<typeof modelSetupDraftSchema>;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAiGatewayConfigured()) {
    return safeErrorResponse('unavailable', 503);
  }

  const requestBody = await readJsonBody(request);
  const parsedRequest = setupDraftRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError(
      'generate-series-setup request validation failed',
      parsedRequest.error,
      {
        model: writerModel,
      },
    );

    return safeErrorResponse('validation', 400);
  }

  try {
    const authResult = await readAuthenticatedUserId(request);

    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const authorization = request.headers.get('Authorization') ?? '';
    const moderationStore = createModerationStore(authorization);
    const activeRestriction = await moderationStore.getActiveRestriction(
      authResult.user.userId,
    );

    if (activeRestriction) {
      return moderationResponse(
        'banned',
        0,
        'This account is currently blocked from generating new series setup.',
      );
    }

    const moderationSignals = scanModerationEntries(
      collectModerationEntries(parsedRequest.data),
    );

    if (moderationSignals.length > 0) {
      const currentState = await moderationStore.getState(
        authResult.user.userId,
      );
      const review = buildModerationReview({
        previousWarningCount: getEffectiveWarningCount(currentState),
        signals: moderationSignals,
      });

      const warningResult = await moderationStore.recordWarning(
        authResult.user.userId,
        'generate-series-setup',
        parsedRequest.data.generationRequestId,
        review,
      );
      // categories exposes policy buckets in logs without retaining matched text.
      const categories: string = [
        ...new Set(moderationSignals.map((signal) => signal.category)),
      ].join(',');
      // sources identifies which setup fields caused the block.
      const sources: string = [
        ...new Set(moderationSignals.map((signal) => signal.sourceLabel)),
      ].join(',');

      logSafeWarning('generate-series-setup moderation blocked', {
        categories,
        sources,
        warningCount: String(warningResult.warningCount),
      });

      return moderationResponse(
        warningResult.isBanned ? 'banned' : 'warning',
        warningResult.warningsRemaining,
        warningResult.isBanned
          ? 'This setup request matched blocked content rules again and the account has been banned.'
          : `This setup request matched blocked content rules. ${warningResult.warningsRemaining} warning${
            warningResult.warningsRemaining === 1 ? '' : 's'
          } remain before a ban.`,
      );
    }

    const { generationRequestId, ...fingerprintPayload } = parsedRequest.data;
    const generationResult = await runIdempotentGeneration({
      generate: () => generateSetupDraft(parsedRequest.data),
      operation: 'generate-series-setup',
      parseResponse: (value) => setupDraftSchema.parse(value),
      requestId: generationRequestId,
      requestPayload: fingerprintPayload,
      scopeId: generationRequestId,
      userId: authResult.user.userId,
    });

    if (generationResult.kind !== 'completed') {
      return generationStateResponse(
        generationResult.kind === 'in_progress'
          ? 'generation_in_progress'
          : 'generation_conflict',
      );
    }

    return jsonResponse({
      ...generationResult.response,
      generationRequestId: generationResult.canonicalRequestId,
    });
  } catch (error) {
    logSafeError('generate-series-setup failed', error, {
      operation: 'generate-series-setup',
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// readJsonBody parses request JSON so validation errors can be logged separately.
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    logSafeError('generate-series-setup JSON parsing failed', error, {
      model: writerModel,
    });

    return undefined;
  }
}

// generateSetupDraft asks the model only when the selected strategy has useful work.
async function generateSetupDraft(
  request: SetupDraftRequest,
): Promise<SetupDraft> {
  if (getFieldsToEvaluate(request).length === 0) {
    return finalizeDraft(request, {
      title: undefined,
      premise: undefined,
      characterProfiles: undefined,
      userRole: undefined,
    });
  }

  return await generateQualityAcceptedCandidate({
    label: 'series-setup',
    generate: async (role, retryHints) => {
      const modelDraft = await generateStructuredObject({
        role,
        schema: modelSetupDraftSchema,
        schemaName: 'series_setup_draft',
        schemaDescription:
          'Only the series setup fields permitted by the selected draft strategy.',
        system: buildSystemPrompt(),
        prompt: appendRetryHints(buildPrompt(request), retryHints),
        // Temperature stays conservative for refinement and opens up only for full rebuilds.
        temperature: role === 'writer'
          ? getGenerationTemperature(request.creativeBrief.draftStrategy)
          : 0.65,
        frequencyPenalty: 0.2,
        maxOutputTokens: 1200,
      });

      // finalizeDraft is the enforcement layer; prompt compliance is never trusted.
      return finalizeDraft(request, modelDraft);
    },
    repair: async (candidate, issues) => {
      const repairedDraft = await generateStructuredObject({
        role: 'fallback',
        schema: modelSetupDraftSchema,
        schemaName: 'series_setup_repair',
        schemaDescription:
          'Only the series setup fields permitted by the selected draft strategy.',
        system: buildRepairSystemPrompt(),
        prompt: buildRepairPrompt(request, candidate, issues),
        temperature: 0.25,
        maxOutputTokens: 1500,
      });

      return finalizeDraft(request, repairedDraft);
    },
    review: (candidate) =>
      reviewGeneratedCandidate({
        workflow: 'series-setup',
        criteria: [
          'All generated title, premise, character descriptions, and learner-role text must be written in English.',
          'The setup must follow every creative-brief anchor and must not introduce anything listed in avoid.',
          `The setup must fit participation mode ${request.participationMode} and every protected creative anchor.`,
          'Title, premise, cast, and user role must describe one coherent original story.',
          'Character names and roles must be distinct enough to avoid confusion.',
          'In character mode, userRole must identify one returned character exactly.',
          'Do not re-evaluate cast size, target-field permissions, or structural preservation rules; the server has already enforced them deterministically.',
          getSetupGenerationTargetPolicy(request.generationTarget)
            .reviewerCriterion,
          'The result must not copy protected story worlds, names, characters, or plots.',
        ],
        context: {
          participationMode: request.participationMode,
          draftStrategy: request.creativeBrief.draftStrategy,
          generationTarget: request.generationTarget,
          creativeBrief: request.creativeBrief,
          currentDraft: {
            title: request.title,
            premise: request.premise,
            characterProfiles: request.characterProfiles,
            mainCharacters: request.mainCharacters,
            emptyCharacterSlotCount: request.emptyCharacterSlotCount,
            userRole: request.userRole,
          },
          fieldsToEvaluate: getFieldsToEvaluate(request),
          serverEnforcedCastSize: getCastSizeConstraint(
            toDraftRequestFields(request),
          ),
        },
        candidate,
      }),
  });
}

// appendRetryHints gives the writer only actionable validator feedback.
function appendRetryHints(
  prompt: string,
  retryHints: readonly string[],
): string {
  if (retryHints.length === 0) {
    return prompt;
  }

  return [
    prompt,
    '',
    'Required corrections from the previous validation pass:',
    ...retryHints.map((hint, index) => `${index + 1}. ${hint}`),
    'Regenerate only fields permitted by the strategy and do not mention these corrections.',
  ].join('\n');
}

// buildSystemPrompt keeps setup generation bounded and original.
function buildSystemPrompt(): string {
  return [
    'You are a collaborative writing assistant for original TV series setups used by English learners.',
    'Extend the learner imagination; never replace or contradict creative-brief anchors.',
    'Output valid JSON containing only setup fields selected by the strategy: { title?, premise?, characterProfiles?, userRole? }.',
    'Do not generate or change the selected participationMode.',
    'All generated fields must describe one coherent story grounded in the creative brief.',
    'In character mode, userRole must exactly equal one characterProfiles[].name.',
    'Never phrase userRole as an instruction such as "You are ..." or "You play ...".',
    'Do not copy protected worlds, names, characters, or plots.',
    'Use plain text only: no Markdown, no bullet lists, no typographic quotes.',
  ].join('\n');
}

// buildRepairSystemPrompt constrains setup recovery to evidence-based field edits.
function buildRepairSystemPrompt(): string {
  return [
    'You are a precise editor for an original English-learning series setup.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Fix every supplied reviewer issue using its code, evidence, and instruction.',
    'Preserve all candidate fields that are not implicated by an issue.',
    'Never change selected constraints or protected creative-brief anchors.',
    'Return only setup fields permitted by the supplied strategy policy.',
    'Do not copy protected worlds, names, characters, or plots.',
    'Use plain text only with ASCII punctuation and no Markdown.',
  ].join('\n');
}

// buildPrompt sends protected anchors and only the current-draft context allowed by strategy.
function buildPrompt(request: SetupDraftRequest): string {
  const resolutionRequest = toDraftRequestFields(request);
  const fieldsToEvaluate = getFieldsToEvaluate(request);
  const currentCharacterProfiles = getProvidedCharacterProfiles(
    resolutionRequest,
  );
  const { draftStrategy, ...protectedCreativeBrief } = request.creativeBrief;
  const payload: Record<string, unknown> = {
    task: 'generate-series-setup',
    draftStrategy,
    generationTarget: request.generationTarget,
    generationOrder: setupTextFields,
    fieldsToEvaluate,
    selectedConstraints: {
      participationMode: request.participationMode,
    },
    protectedCreativeBrief,
    strategyPolicy: getDraftStrategyPolicy(draftStrategy),
    targetPolicy: getSetupGenerationTargetPolicy(request.generationTarget)
      .writerInstruction,
  };

  if (draftStrategy === 'fill-missing') {
    payload.fixedDraftFields = {
      title: request.title,
      premise: request.premise,
      userRole: request.participationMode === 'character'
        ? request.userRole
        : undefined,
      characterProfiles: currentCharacterProfiles,
      emptyCharacterSlotCount: request.emptyCharacterSlotCount,
    };
  } else if (draftStrategy === 'refine') {
    payload.currentDraft = {
      title: request.title,
      premise: request.premise,
      userRole: request.participationMode === 'character'
        ? request.userRole
        : undefined,
      characterProfiles: currentCharacterProfiles,
      emptyCharacterSlotCount: request.emptyCharacterSlotCount,
    };
  }

  const baseOutputRules = [
    'Return only fields permitted by strategyPolicy. Omitted refine fields are preserved by the server.',
    'Treat idea, worldAndSetting, backstory, storyDriver, and mustInclude as factual human-authored anchors.',
    'Treat protectedCreativeBrief.avoid as excluded content; do not include any listed theme or element.',
    'premise: two to four sentences in one paragraph that set up a concrete situation and hook for the first episode while leaving the story open to continue. In character mode, leave a clear place for the learner to act. Keep it under 900 characters.',
    'characterProfiles: an array of distinct objects with id, name, and description. A generated name must be a name only, without a title or role. A generated description is one concise sentence about role, personality, or story function.',
    'For character mode, userRole is required and must exactly match one characterProfiles[].name: the character the learner plays. Never phrase it as a second-person sentence such as "You are ...". Keep it under 80 characters.',
    'When refining a Character-mode cast, keep the current userRole character whenever compatible with the protected brief and selected cast size. If that character cannot remain, return a replacement userRole that exactly matches the new cast.',
    'For director mode, omit userRole.',
    'title: two to five words, evocative and memorable, reflecting the premise, with no surrounding quotation marks. Keep it under 150 characters.',
    buildCastRule(request, currentCharacterProfiles.length),
  ];

  payload.outputRules = baseOutputRules;

  return JSON.stringify(payload, null, 2);
}

// buildRepairPrompt sends the accepted field policy, candidate, and concrete evidence.
function buildRepairPrompt(
  request: SetupDraftRequest,
  candidate: SetupDraft,
  issues: QualityReview['issues'],
): string {
  return JSON.stringify(
    {
      task: 'repair-reviewed-series-setup',
      draftStrategy: request.creativeBrief.draftStrategy,
      generationTarget: request.generationTarget,
      fieldsToEvaluate: getFieldsToEvaluate(request),
      strategyPolicy: getDraftStrategyPolicy(
        request.creativeBrief.draftStrategy,
      ),
      selectedConstraints: {
        participationMode: request.participationMode,
        castSize: getCastSizeConstraint(toDraftRequestFields(request)),
      },
      protectedCreativeBrief: request.creativeBrief,
      candidate,
      reviewerIssues: issues,
      outputRules: [
        'Resolve every reviewer issue with the smallest possible edit.',
        getSetupGenerationTargetPolicy(request.generationTarget)
          .repairInstruction,
        'Return every field listed in fieldsToEvaluate; copy unaffected permitted fields exactly from candidate so server preservation does not restore an older draft value.',
        'Preserve unaffected names, roles, facts, and wording.',
        'In character mode, userRole must exactly match one returned characterProfiles name.',
        'In director mode, omit userRole.',
        'Return only title, premise, characterProfiles, and userRole fields permitted by strategyPolicy.',
        'Do not add explanations, change logs, Markdown, or fields outside the schema.',
      ],
    },
    null,
    2,
  );
}

// finalizeDraft enforces preservation, cast size, mode, and cross-field consistency.
function finalizeDraft(
  request: SetupDraftRequest,
  draft: ModelSetupDraft,
): SetupDraft {
  const resolutionRequest = toDraftRequestFields(request);
  const resolved = resolveDraftFields(resolutionRequest, draft);
  const castSizeConstraint = getCastSizeConstraint(resolutionRequest);

  if (
    castSizeConstraint.exact !== undefined &&
    resolved.characterProfiles.length !== castSizeConstraint.exact
  ) {
    throw new Error(
      `characterProfiles must contain exactly ${castSizeConstraint.exact} profiles for this request.`,
    );
  }

  if (
    resolved.characterProfiles.length < castSizeConstraint.minimum ||
    resolved.characterProfiles.length > castSizeConstraint.maximum
  ) {
    throw new Error(
      `characterProfiles must contain ${castSizeConstraint.minimum} to ${castSizeConstraint.maximum} profiles for this request.`,
    );
  }

  if (
    request.participationMode === 'character' && resolved.userRole === undefined
  ) {
    throw new Error('userRole is required in character mode.');
  }

  return setupDraftSchema.parse(resolved);
}

// toDraftRequestFields maps the transport contract to the pure resolution contract.
function toDraftRequestFields(request: SetupDraftRequest): DraftRequestFields {
  return {
    strategy: request.creativeBrief.draftStrategy,
    ...(request.generationTarget !== undefined
      ? { generationTarget: request.generationTarget }
      : {}),
    participationMode: request.participationMode,
    ...(request.title !== undefined ? { title: request.title } : {}),
    ...(request.premise !== undefined ? { premise: request.premise } : {}),
    mainCharacters: request.mainCharacters,
    characterProfiles: request.characterProfiles,
    emptyCharacterSlotCount: request.emptyCharacterSlotCount,
    ...(request.userRole !== undefined ? { userRole: request.userRole } : {}),
    ...(request.creativeBrief.preferredCastSize !== undefined
      ? { preferredCastSize: request.creativeBrief.preferredCastSize }
      : {}),
  };
}

// getFieldsToEvaluate derives required or discretionary model work from strategy.
function getFieldsToEvaluate(
  request: SetupDraftRequest,
): readonly SetupDraftField[] {
  const resolutionRequest = toDraftRequestFields(request);

  return setupTextFields.filter((field) =>
    shouldEvaluateSetupField(resolutionRequest, field)
  );
}

// buildCastRule explains the deterministic preferred-cast behavior to the model.
function buildCastRule(
  request: SetupDraftRequest,
  pinnedCount: number,
): string {
  const preferredCastSize = request.creativeBrief.preferredCastSize;
  const strategy = request.creativeBrief.draftStrategy;
  const emptyCharacterSlotCount = request.emptyCharacterSlotCount;
  const minimumVisibleSize = pinnedCount + emptyCharacterSlotCount;

  if (
    request.generationTarget !== undefined &&
    request.generationTarget !== 'characterProfiles' &&
    pinnedCount > 0
  ) {
    return `Preserve the existing ${pinnedCount} character profiles exactly; this request targets ${request.generationTarget}, not the cast.`;
  }

  if (strategy === 'refine') {
    const requiredSize = preferredCastSize === undefined
      ? minimumVisibleSize
      : preferredCastSize;
    const generatedSizeRule = preferredCastSize !== undefined
      ? `The learner selected an exact cast size. Return exactly ${preferredCastSize} complete profiles; remove or replace current profiles as needed. Visible rows beyond that selected total do not need to remain.`
      : emptyCharacterSlotCount > 0
      ? `Return a complete cast of ${Math.max(requiredSize, 1)} to ${
        Math.max(requiredSize, 8)
      } profiles and fill every visible empty character row.`
      : 'If replacing the cast, return one to eight complete profiles.';

    return `Evaluate the current cast as a whole. ${
      preferredCastSize !== undefined || emptyCharacterSlotCount > 0
        ? 'characterProfiles is required when the current complete cast does not satisfy the selected total or visible fill slots.'
        : 'Omit characterProfiles when no meaningful improvement is needed.'
    } ${generatedSizeRule}`;
  }

  if (strategy === 'rebuild') {
    return preferredCastSize === undefined
      ? 'Generate one to eight completely new character profiles.'
      : `Generate exactly ${preferredCastSize} completely new character profiles.`;
  }

  if (preferredCastSize === undefined) {
    if (pinnedCount === 0) {
      const minimumGeneratedCount = Math.max(emptyCharacterSlotCount, 1);

      return `Choose an appropriate cast size from ${minimumGeneratedCount} to ${
        Math.max(minimumGeneratedCount, 8)
      } and return that many character profiles.`;
    }

    const minimumFinalSize = Math.max(
      minimumVisibleSize,
      Math.min(pinnedCount + 1, 8),
    );
    const maximumFinalSize = Math.max(minimumFinalSize, 8);

    return `Preserve all ${pinnedCount} pinned profiles. Choose a final cast size from ${minimumFinalSize} to ${maximumFinalSize}, then return only the new profiles needed to reach that size. Do not repeat pinned profiles.`;
  }

  const expectedCastSize = Math.max(
    preferredCastSize,
    minimumVisibleSize,
  );
  const additionsNeeded = expectedCastSize - pinnedCount;

  return `Preserve all ${pinnedCount} pinned profiles and return exactly ${additionsNeeded} new distinct profiles to reach ${expectedCastSize} total. Do not repeat pinned profiles.`;
}

// getDraftStrategyPolicy translates update permission into explicit model behavior.
function getDraftStrategyPolicy(
  strategy: SetupDraftRequest['creativeBrief']['draftStrategy'],
): string {
  if (strategy === 'fill-missing') {
    return 'Fill missing required fields only. Never return or change an existing fixedDraftFields value. Preserve every pinned character and supplement the cast when visible empty rows or AI-chosen cast size require additions.';
  }

  if (strategy === 'refine') {
    return 'Review the current draft as a whole. Fill every missing required field. An explicit preferredCastSize is an exact learner constraint and requires resizing the cast. Otherwise, return a replacement for an existing field only when doing so meaningfully improves coherence, originality, or alignment with the protected creative brief. Leave strong fields omitted and unchanged. Never edit merely to demonstrate a change.';
  }

  return 'Build every final draft field from scratch. Ignore the previous final draft completely. Follow protected creative-brief anchors when supplied; when they are empty, invent an original setup that fits the selected participation mode.';
}

// getGenerationTemperature keeps selective editing stable and full rebuilding inventive.
function getGenerationTemperature(
  strategy: SetupDraftRequest['creativeBrief']['draftStrategy'],
): number {
  if (strategy === 'fill-missing') {
    return 0.55;
  }

  if (strategy === 'refine') {
    return 0.65;
  }

  return 0.85;
}

// normalizeCharacterName supports request-level duplicate and role checks.
function normalizeCharacterName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
