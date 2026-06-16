import { generateText } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';
import { z } from 'npm:zod';

import {
  corsHeaders,
  jsonResponse,
  logSafeError,
  moderationResponse,
  safeErrorResponse,
} from '../_shared/http.ts';
import { readAuthenticatedUserId } from '../_shared/auth.ts';
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

// setupTextFields enumerates the AI-fillable text fields that may be regenerated one at a time.
const setupTextFields = ['title', 'premise', 'mainCharacters', 'userRole'] as const;

// setupDraftRequestSchema validates selected constraints and optional user text.
const setupDraftRequestSchema = z.object({
  // regenerateField, when present, forces a fresh value for only that field while others are preserved.
  regenerateField: z.enum(setupTextFields).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  genre: z.enum(['daily-life', 'work-it', 'travel-leisure', 'short-fiction']),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  tone: z.string().trim().min(1).max(120),
  participationMode: z.enum(['director', 'character']),
  premise: z.string().trim().min(1).max(1000).optional(),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).max(8),
  userRole: z.string().trim().min(1).max(160).optional(),
});

// setupDraftSchema is the complete text setup returned to the mobile form.
const setupDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  premise: z.string().trim().min(1).max(1000),
  mainCharacters: z.array(z.string().trim().min(1).max(160)).min(1).max(8),
  userRole: z.string().trim().min(1).max(160).optional(),
}).superRefine((draft, context) => {
  if (draft.mainCharacters.length === 0) {
    context.addIssue({
      code: 'custom',
      message: 'At least one main character is required.',
      path: ['mainCharacters'],
    });
  }
});

// SetupDraftRequest is the parsed Edge request contract.
type SetupDraftRequest = z.infer<typeof setupDraftRequestSchema>;

// SeriesSetupTextField names a single AI-fillable text field eligible for individual regeneration.
type SeriesSetupTextField = (typeof setupTextFields)[number];

// SetupDraft is the validated complete setup response.
type SetupDraft = z.infer<typeof setupDraftSchema>;

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

    return jsonResponse(await generateSetupDraft(parsedRequest.data));
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
  let validationError: Error | undefined;

  for (let attempt = 1; attempt <= setupDraftAttempts; attempt += 1) {
    const result = await generateText({
      model: openrouterProvider!(openrouterModel),
      system: buildSystemPrompt(),
      prompt: validationError
        ? `${buildPrompt(request)}\n\nPrevious validation error: ${validationError.message}\nRegenerate the JSON object from scratch.`
        : buildPrompt(request),
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    try {
      return finalizeDraft(request, setupDraftSchema.parse(parseJsonObject(result.text)));
    } catch (error) {
      validationError = error instanceof Error ? error : new Error(String(error));

      logSafeError('generate-series-setup validation failed', validationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw validationError ?? new Error('Series setup draft validation failed.');
}

// buildSystemPrompt keeps setup generation bounded and original.
function buildSystemPrompt(): string {
  return [
    'You generate complete setup text for an original personal English-learning series.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Do not generate or change selected list fields: cefrLevel, genre, tone, or participationMode.',
    'Preserve any provided title, premise, mainCharacters, and userRole exactly unless they are unsafe.',
    'Fill only missing text fields with concise, original, safe content.',
    'When regenerateField is set, produce a fresh, clearly different value for only that one field,',
    'keep it consistent with all other provided fields, and copy every other provided field exactly.',
    'Do not copy protected worlds, names, characters, or plots.',
    'Use plain text only: no Markdown, no bullet lists, no typographic quotes.',
  ].join('\n');
}

// buildPrompt sends selected constraints and optional user-provided setup text.
function buildPrompt(request: SetupDraftRequest): string {
  return JSON.stringify(
    {
      task: 'generate-series-setup',
      // regenerateField marks the only field that must change; absent means fill all missing fields.
      regenerateField: request.regenerateField,
      selectedConstraints: {
        cefrLevel: request.cefrLevel,
        genre: request.genre,
        tone: request.tone,
        participationMode: request.participationMode,
      },
      providedText: {
        title: request.title,
        premise: request.premise,
        mainCharacters: request.mainCharacters,
        userRole: request.userRole,
      },
      outputRules: [
        'Return exactly: title, premise, mainCharacters, userRole.',
        'title must be short and memorable.',
        'premise must be one compact paragraph suitable for the first episode.',
        'mainCharacters must be an array of strings containing one to four recurring original characters.',
        'For character mode, userRole is required and must describe who the learner is inside the story.',
        'For director mode, omit userRole.',
        'Keep all text suitable for the selected CEFR level and tone.',
        ...(request.regenerateField
          ? [
              `Regenerate only ${request.regenerateField} with a new value different from the provided one.`,
              'Copy every other provided field exactly and do not alter it.',
            ]
          : []),
      ],
    },
    null,
    2,
  );
}

// finalizeDraft enforces preservation and mode-specific fields after AI generation.
function finalizeDraft(request: SetupDraftRequest, draft: SetupDraft): SetupDraft {
  // keepProvided returns true when a field must be preserved instead of taking the AI value.
  // The single regenerate target always takes the freshly generated value.
  const keepProvided = (field: SeriesSetupTextField): boolean =>
    request.regenerateField !== field;

  const title = keepProvided('title') ? request.title ?? draft.title : draft.title;
  const premise = keepProvided('premise')
    ? request.premise ?? draft.premise
    : draft.premise;
  const mainCharacters =
    keepProvided('mainCharacters') && request.mainCharacters.length > 0
      ? request.mainCharacters
      : draft.mainCharacters;
  const userRole =
    request.participationMode === 'character'
      ? keepProvided('userRole')
        ? request.userRole ?? draft.userRole
        : draft.userRole
      : undefined;

  return setupDraftSchema.parse({
    title,
    premise,
    mainCharacters,
    ...(userRole ? { userRole } : {}),
  });
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
