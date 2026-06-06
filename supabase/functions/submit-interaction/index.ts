import { generateObject } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';

import {
  interactionPayloadSchema,
  submitInteractionRequestSchema,
  type SubmitInteractionRequest,
} from '../_shared/episodeContracts.ts';
import { finalizeInteractionPayload } from '../_shared/episodeFinalizers.ts';
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
  const parsedRequest = submitInteractionRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError('submit-interaction request validation failed', parsedRequest.error, {
      model: openrouterModel,
    });

    return safeErrorResponse('validation', 400);
  }

  try {
    const payload = parsedRequest.data;
    const result = await generateObject({
      model: openrouterProvider(openrouterModel),
      schema: interactionPayloadSchema,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(payload),
      temperature: 0.4,
      maxOutputTokens: 1800,
    });
    const validatedPayload = finalizeInteractionPayload({
      payload: result.object,
      request: payload,
    });

    return jsonResponse(validatedPayload);
  } catch (error) {
    logSafeError('submit-interaction AI generation failed', error, {
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
    logSafeError('submit-interaction JSON parsing failed', error, {
      model: openrouterModel,
    });

    return undefined;
  }
}

// buildSystemPrompt keeps correction and continuation rules server-side.
function buildSystemPrompt(): string {
  return [
    'You continue one interactive English-learning episode after the learner answers.',
    'Return only JSON that matches the provided schema.',
    'Feedback must be one or two short sentences, story-friendly, and useful.',
    'If the learner answer is already natural and correct, confirm it and do not invent an error.',
    'Correct only real grammar or word-choice problems.',
    'Never begin feedback with a colon, dash, label, heading, or category name.',
    'Continuation text belongs to the same episode, not a new episode.',
    'Respect the requested CEFR level strictly.',
    'Do not copy protected worlds, names, characters, or plots.',
    'Keep memory updates compact and bounded.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
    'Summaries and memory updates must describe only story events, never mention schema, prompts, corrections, or app mechanics.',
  ].join('\n');
}

// buildUserPrompt sends only bounded context and the learner answer.
function buildUserPrompt(payload: SubmitInteractionRequest): string {
  return JSON.stringify(
    {
      task: 'submit-interaction',
      requirements: {
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        interactionPrompt: payload.interactionPrompt,
        selectedChoiceId: payload.selectedChoiceId,
        selectedChoiceLabel: payload.selectedChoiceLabel,
        userReply: payload.userReply,
        safetyAndCopyrightConstraints: payload.safetyAndCopyrightConstraints,
      },
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        episodeSummary: payload.episodeSummary,
      },
      outputRules: [
        'feedback must not become a grammar lesson.',
        'For a correct controlled choice, use a pattern like: Good choice. "Open the door carefully" sounds natural.',
        'For an incorrect reply, briefly name the most important issue and give one natural corrected sentence.',
        'Do not merely describe which adverb, noun, or tense the learner used.',
        'Do not invent a correction when the submitted text is already correct.',
        'feedback must start with a letter or quotation mark, never punctuation such as a colon.',
        'continuationText must show the story consequence of the learner answer.',
        'continuationText must contain exactly the continuationSentences joined in reading order.',
        'continuationSentences must support sentence-by-sentence TTS playback.',
        'summaryUpdate must summarize the whole episode after the answer.',
        'memoryUpdate.lastEpisodeSummary must describe the same final state as summaryUpdate.',
        'memoryUpdate must not include full transcripts.',
        'Do not write meta text such as "The user chose" unless it is a natural story fact.',
        'Do not use asterisks, markdown emphasis, curly quotes, curly apostrophes, or ellipsis characters.',
        'Prefer natural collocations such as "growing curiosity", not unusual phrases such as "friendly curiosity".',
      ],
    },
    null,
    2,
  );
}
