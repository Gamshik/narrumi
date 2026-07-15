import { generateText } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';
import { z } from 'npm:zod';

import {
  corsHeaders,
  generationStateResponse,
  jsonResponse,
  logSafeError,
  logSafeInfo,
  moderationResponse,
  safeErrorResponse,
} from '../_shared/http.ts';
import { runIdempotentGeneration } from '../_shared/generationIdempotency.ts';
import { readAuthenticatedUserId } from '../_shared/auth.ts';
import { isRepeatedSetupConcept } from './regeneration.ts';
import { resolveDraftFields } from './draftPreservation.ts';
import {
  buildModerationReview,
  collectModerationEntries,
  createModerationStore,
  getEffectiveWarningCount,
  scanModerationEntries,
} from '../_shared/moderation.ts';

// openrouterApiKey is the server-only secret used by the AI boundary.
const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

// openrouterModel selects the deployed model without exposing provider settings to mobile.
const openrouterModel =
  Deno.env.get('OPENROUTER_MODEL') ?? 'openai/gpt-4o-mini';

// openrouterProvider is the OpenAI-compatible Vercel AI SDK provider for OpenRouter.
const openrouterProvider = openrouterApiKey
  ? createOpenAI({
      apiKey: openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  : undefined;

// setupDraftAttempts is the maximum retry count for structured setup generation.
const setupDraftAttempts = 3;

// setupTextFields lists the AI-fillable text fields in canonical generation order.
// Generation follows this order so each field is produced from the selected constraints
// plus every field before it. This keeps the premise, characters, learner role, and
// title connected to one coherent story instead of being invented independently.
const setupTextFields = ['premise', 'mainCharacters', 'userRole', 'title'] as const;

// setupDraftRequestSchema validates selected constraints and optional user text.
const setupDraftRequestSchema = z.object({
  generationRequestId: z.string().trim().min(1).max(240),
  title: z.string().trim().min(1).max(160).optional(),
  genre: z.enum(['daily-life', 'work-it', 'travel-leisure', 'short-fiction']),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  tone: z.string().trim().min(1).max(120),
  participationMode: z.enum(['director', 'character']),
  premise: z.string().trim().min(1).max(1000).optional(),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).max(8),
  characterProfiles: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300),
      }),
    )
    .max(8)
    .optional(),
  userRole: z.string().trim().min(1).max(160).optional(),
});

// setupDraftSchema is the complete text setup returned to the mobile form.
const setupDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  premise: z.string().trim().min(1).max(1000),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).min(1).max(8),
  characterProfiles: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300),
      }),
    )
    .min(1)
    .max(8),
  userRole: z.string().trim().min(1).max(160).optional(),
}).superRefine((draft, context) => {
  if (draft.mainCharacters.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'At least one main character is required.',
      path: ['mainCharacters'],
    });
  }

  if (draft.characterProfiles.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'At least one character profile is required.',
      path: ['characterProfiles'],
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
    mainCharacters: z.array(z.string().trim().max(160).nullish()).max(8).nullish(),
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
    mainCharacters: (draft.mainCharacters ?? []).filter(
      (character): character is string =>
        typeof character === 'string' && character.length > 0,
    ),
    characterProfiles: (draft.characterProfiles ?? []).flatMap((profile, index) => {
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

  if (!openrouterProvider) {
    return safeErrorResponse('unavailable', 503);
  }

  const requestBody = await readJsonBody(request);
  const parsedRequest = setupDraftRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError('generate-series-setup request validation failed', parsedRequest.error, {
      model: openrouterModel,
    });

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
      const currentState = await moderationStore.getState(authResult.user.userId);
      const review = buildModerationReview({
        previousWarningCount: getEffectiveWarningCount(currentState),
        signals: moderationSignals,
      });

      await moderationStore.recordWarning(
        authResult.user.userId,
        'generate-series-setup',
        review,
      );

      return moderationResponse(
        review.shouldBan ? 'banned' : 'warning',
        review.warningsRemaining,
        review.shouldBan
          ? 'This setup request matched blocked content rules again and the account has been banned.'
          : `This setup request matched blocked content rules. ${review.warningsRemaining} warning${review.warningsRemaining === 1 ? '' : 's'} remain before a ban.`,
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
      model: openrouterModel,
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
      model: openrouterModel,
    });

    return undefined;
  }
}

// generateSetupDraft asks the model for complete setup text and validates preservation.
async function generateSetupDraft(request: SetupDraftRequest): Promise<SetupDraft> {
  let lastError: Error | undefined;
  // Validation failures, repeated field values, or repeated full concepts.
  const maxAttempts = setupDraftAttempts + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await generateText({
      model: openrouterProvider!(openrouterModel),
      system: buildSystemPrompt(),
      prompt: lastError
        ? `${buildPrompt(request)}\n\nPrevious attempt failed: ${lastError.message}\nGenerate the JSON object again from scratch.`
        : buildPrompt(request),
      // Full setup generation needs enough variety to avoid repeating the current concept.
      temperature: 0.8,
      maxOutputTokens: 900,
    });

    try {
      // Parse the model output leniently, then preserve provided fields and
      // strictly validate only the assembled draft inside finalizeDraft.
      const draft = finalizeDraft(
        request,
        modelSetupDraftSchema.parse(parseJsonObject(result.text)),
      );

      const repeatedConcept = isRepeatedSetupConcept({
        title: request.title,
        premise: request.premise,
        userRole: request.userRole,
        mainCharacters: request.mainCharacters,
      }, draft);

      if (repeatedConcept && attempt < maxAttempts) {
        lastError = new Error(
          `The generated setup concept is too similar to the previous one; produce a completely new story idea.`,
        );

        logSafeInfo('generate-series-setup retrying repeated concept', {
          attempt: String(attempt),
          model: openrouterModel,
        });

        continue;
      }

      return draft;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logSafeError('generate-series-setup attempt failed', lastError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw lastError ?? new Error('Series setup draft validation failed.');
}

// buildSystemPrompt keeps setup generation bounded and original.
function buildSystemPrompt(): string {
  return [
    'You are a creative writing assistant specialized in TV series setups for language learners.',
    'Generate a completely new TV series setup draft tailored to the constraints. If a previous concept is provided, create a distinct story, do not repeat the previous one.',
    'Output must be valid JSON matching this schema: { title, premise, mainCharacters, characterProfiles, userRole? }.',
    'Do not generate or change selected list fields: cefrLevel, genre, tone, or participationMode.',
    'Fill missing text fields with concise, original, safe content.',
    'Follow generationOrder: build each field from the selected constraints and from every field that',
    'appears earlier in generationOrder, so the premise, characters, learner role, and title stay',
    'connected to one story instead of being invented independently.',
    'In particular, derive characterProfiles and userRole directly from the premise: they must be people who',
    'plausibly appear in that exact situation and have a clear relationship to it, not unrelated names.',
    'In character mode, userRole is the character the learner plays and must exactly match one',
    'characterProfiles[].name rather than inventing a separate person. Never write userRole as a second-person sentence or',
    'instruction such as "You are ..." or "You play ...".',
    'Do not copy protected worlds, names, characters, or plots.',
    'Use plain text only: no Markdown, no bullet lists, no typographic quotes.',
  ].join('\n');
}

// buildPrompt sends selected constraints and optional user-provided setup text.
function buildPrompt(request: SetupDraftRequest): string {
  const payload: Record<string, unknown> = {
    task: 'generate-series-setup',
    // generationOrder is the canonical dependency order; each field must stay consistent with the
    // selected constraints and with every field listed before it, whether provided or just generated.
    generationOrder: setupTextFields,
    selectedConstraints: {
      cefrLevel: request.cefrLevel,
      genre: request.genre,
      tone: request.tone,
      participationMode: request.participationMode,
    },
  };

  const baseOutputRules = [
    'Return exactly: title, premise, mainCharacters, characterProfiles, userRole.',
    'Build fields in generationOrder; each field must stay consistent with the selected constraints and with every earlier field.',
    'premise: two to four sentences in one paragraph that set up a concrete situation and hook for the first episode, match the genre and tone, and leave the story open to continue. In character mode, leave a clear place for the learner to act. Keep it under 900 characters.',
    'mainCharacters: an array of one to four distinct, original recurring character names only. Do not include titles, roles, descriptions, commas, or phrases such as "the detective". Good: "Corbin". Bad: "Detective Corbin" or "Corbin the detective".',
    'characterProfiles: one object per mainCharacters entry, with id, name, and description. name must exactly match a mainCharacters entry. description should explain the character role, personality, or story function in one concise sentence.',
    'For character mode, userRole is required and must exactly match one characterProfiles[].name: the character the learner plays. Never phrase it as a second-person sentence such as "You are ...". Keep it under 80 characters.',
    'For director mode, omit userRole.',
    'title: two to five words, evocative and memorable, reflecting the premise and tone, with no surrounding quotation marks. Keep it under 150 characters.',
    'Match every generated field to the selected CEFR level and tone: use simpler words and shorter sentences for lower levels (A1, A2) and richer language only for higher levels.',
  ];

  // avoidText gives the model the current draft only as content to move away from.
  payload.avoidText = {
    title: request.title,
    premise: request.premise,
    mainCharacters:
      request.mainCharacters.length > 0 ? request.mainCharacters : undefined,
    characterProfiles:
      request.characterProfiles && request.characterProfiles.length > 0
        ? request.characterProfiles
        : undefined,
    userRole: request.userRole,
  };
  payload.outputRules = [
    ...baseOutputRules,
    'Generate fresh values for every text field from the selected constraints; do not preserve or assume previous setup text.',
  ];

  return JSON.stringify(payload, null, 2);
}

// finalizeDraft assembles the kept and regenerated fields, then strictly validates the
// result. The only setup generation action regenerates every text field coherently.
function finalizeDraft(
  request: SetupDraftRequest,
  draft: ModelSetupDraft,
): SetupDraft {
  const resolved = resolveDraftFields(request, draft);
  const characterProfiles =
    resolved.characterProfiles.length > 0
      ? resolved.characterProfiles
      : resolved.mainCharacters.map((name, index) => ({
          id: createCharacterProfileId(name, index),
          name,
          description: name,
        }));

  return setupDraftSchema.parse({
    ...resolved,
    mainCharacters: characterProfiles.map((profile) => profile.name),
    characterProfiles,
  });
}

// createCharacterProfileId produces deterministic ids from generated names.
function createCharacterProfileId(name: string, index: number): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `character:${slug || `profile-${index + 1}`}`;
}

// parseJsonObject extracts a JSON object even when a model adds accidental prose.
function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error('AI response did not contain a JSON object.');
  }
}
