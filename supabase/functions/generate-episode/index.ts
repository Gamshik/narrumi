import { generateObject } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';

import {
  episodePayloadSchema,
  generateEpisodeRequestSchema,
  type GenerateEpisodeRequest,
} from '../_shared/episodeContracts.ts';
import { finalizeEpisodePayload } from '../_shared/episodeFinalizers.ts';
import {
  corsHeaders,
  jsonResponse,
  logSafeError,
  safeErrorResponse,
} from '../_shared/http.ts';

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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return safeErrorResponse('validation', 405);
  }

  if (!openrouterProvider) {
    return safeErrorResponse('unavailable', 503);
  }

  const requestBody = await readJsonBody(request);
  const parsedRequest = generateEpisodeRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError('generate-episode request validation failed', parsedRequest.error, {
      model: openrouterModel,
    });

    return safeErrorResponse('validation', 400);
  }

  try {
    const payload = parsedRequest.data;
    const validatedPayload = await generateValidatedEpisode(payload);

    return jsonResponse(validatedPayload);
  } catch (error) {
    logSafeError('generate-episode AI generation failed', error, {
      model: openrouterModel,
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// generateValidatedEpisode retries once only when cross-field episode rules fail.
async function generateValidatedEpisode(
  payload: GenerateEpisodeRequest,
): Promise<ReturnType<typeof finalizeEpisodePayload>> {
  let finalizationError: Error | undefined;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await generateObject({
      model: openrouterProvider!(openrouterModel),
      schema: episodePayloadSchema,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(payload, finalizationError?.message),
      temperature: 0.4,
      maxOutputTokens: 2600,
    });

    try {
      return finalizeEpisodePayload({
        payload: result.object,
        request: payload,
      });
    } catch (error) {
      finalizationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('generate-episode finalization failed', finalizationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw finalizationError ?? new Error('Episode finalization failed.');
}

// readJsonBody parses request JSON so validation errors can be logged separately.
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    logSafeError('generate-episode JSON parsing failed', error, {
      model: openrouterModel,
    });

    return undefined;
  }
}

// buildSystemPrompt keeps generation rules server-side and schema-oriented.
function buildSystemPrompt(): string {
  return [
    'You write short interactive English-learning episodes for Context English.',
    'Return only JSON that matches the provided schema.',
    'Write original stories only. Do not copy protected worlds, names, characters, or plots.',
    'Respect the requested CEFR level strictly.',
    'Use selected Story Words naturally in the scene.',
    'Use every selected Story Word in its exact dictionary form at least once.',
    'Create exactly one choice interaction point with two or three distinct options.',
    'Keep feedback out of generate-episode; feedback belongs to submit-interaction.',
    'Keep memory updates compact and bounded.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
    'Inline translation annotations must be real Russian Cyrillic text for a Russian-speaking learner.',
    'For example: curious -> любопытный, whisper -> шепот.',
    'Never output broken mojibake text such as "Ð»Ñ" or "ÑÐ".',
    'Do not transliterate Russian translations with Latin letters.',
    'Summaries and memory updates must describe only story events, never mention schema, interaction points, prompts, or app mechanics.',
  ].join('\n');
}

// buildUserPrompt sends bounded context required by the PRD and architecture.
function buildUserPrompt(
  payload: GenerateEpisodeRequest,
  previousFailure?: string,
): string {
  return JSON.stringify(
    {
      task: 'generate-episode',
      ...(previousFailure
        ? {
            retryInstruction:
              `The previous output failed validation: ${previousFailure}. Correct this issue in the new output.`,
          }
        : {}),
      requirements: {
        episodeLength:
          'Keep the episode concise enough for a comfortable mobile learning session, but substantial enough to develop the scene, use Story Words naturally, and lead to a meaningful interaction. Adapt length to CEFR level, scene needs, and narrative pacing. Do not target or enforce a fixed word-count range.',
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        premise: payload.premise,
        mainCharacters: payload.mainCharacters,
        userRole: payload.userRole,
        episodeNumber: payload.orderIndex,
        storyWords: payload.selectedStoryWords,
        safetyAndCopyrightConstraints: payload.safetyAndCopyrightConstraints,
      },
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        lastEpisodeSummary: payload.lastEpisodeSummary,
      },
      outputRules: [
        'sceneText must be the same content as sentences joined in reading order.',
        'Use adaptive length: concise, readable on mobile, substantial enough for natural Story Word context and meaningful interaction.',
        'Do not pad the scene to reach a number of words, and do not shorten it if the scene needs a little more context.',
        'sentences must support sentence-by-sentence TTS playback.',
        'storyWordIds must contain every selected Story Word id exactly once.',
        'Every selected Story Word must have an annotation with its selected id, exact surface text, Russian translation, and correct sentenceIndex.',
        'Use the exact selected dictionary form in scene text; do not replace curious with curiosity or whisper with whispered.',
        'choices must be useful continuations, not quizzes.',
        'interaction.kind must be choice and interaction.choices must contain two or three distinct options.',
        'cliffhanger must create a clear reason to continue the series.',
        'summaryUpdate and memoryUpdate.lastEpisodeSummary must be story-only continuity summaries.',
        'Do not write meta text such as "Added interaction point" or "The episode introduces".',
        'Do not use asterisks, markdown emphasis, curly quotes, curly apostrophes, or ellipsis characters.',
        'Use Russian Cyrillic in annotations.translation, not English definitions and not Latin transliteration.',
        'Good translations: "любопытный", "шепот". Bad translations: "curious", "showing interest", "lyubopytnyy", "Ð»ÑÐ±".',
      ],
    },
    null,
    2,
  );
}
