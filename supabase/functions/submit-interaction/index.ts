import { generateText } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';

import {
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

// PREVIOUS_DECISION_PROMPT_LIMIT keeps prompt context bounded for one episode.
const PREVIOUS_DECISION_PROMPT_LIMIT = 10;

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
    const validatedPayload = await generateValidatedInteraction(payload);

    return jsonResponse(validatedPayload);
  } catch (error) {
    logSafeError('submit-interaction AI generation failed', error, {
      model: openrouterModel,
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// generateValidatedInteraction retries once when episode progression rules fail.
async function generateValidatedInteraction(
  payload: SubmitInteractionRequest,
): Promise<ReturnType<typeof finalizeInteractionPayload>> {
  let finalizationError: Error | undefined;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await generateText({
      model: openrouterProvider!(openrouterModel),
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(payload, finalizationError?.message),
      temperature: 0.2,
      maxOutputTokens: 1800,
    });

    try {
      return finalizeInteractionPayload({
        payload: parseJsonObject(result.text),
        request: payload,
      });
    } catch (error) {
      finalizationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('submit-interaction finalization failed', finalizationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw finalizationError ?? new Error('Interaction finalization failed.');
}

// parseJsonObject extracts a raw JSON object even when a model wraps it in fences.
function parseJsonObject(text: string): unknown {
  const trimmedText = text.trim();
  const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmedText;
  const objectStart = candidate.indexOf('{');
  const objectEnd = candidate.lastIndexOf('}');

  if (objectStart < 0 || objectEnd <= objectStart) {
    throw new Error('AI response did not contain a JSON object.');
  }

  return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
}

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
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Do not include any text before or after the JSON object.',
    'Feedback must be one or two short sentences, story-friendly, and useful.',
    'If the learner answer is already natural and correct, confirm it and do not invent an error.',
    'Correct only real grammar or word-choice problems.',
    'Never begin feedback with a colon, dash, label, heading, or category name.',
    'Continuation text belongs to the same episode, not a new episode.',
    'The current episode is a multi-turn story arc, not a single choice and response.',
    'An episode normally contains 5-10 meaningful learner interactions.',
    'Never complete an episode before the fifth learner interaction.',
    'At the tenth learner interaction, you must complete the current episode.',
    'Every continuation and next interaction must be paced toward ending the current episode within 5-10 learner interactions.',
    'Do not introduce a large new subplot when fewer than three interactions remain before the hard stop.',
    'From the fifth interaction onward, decide whether the current episode arc has reached a meaningful closing beat.',
    'Completing the current episode never means completing the overall personal series.',
    'When completing an episode, resolve or transform the local conflict and end with a hook for the next episode.',
    'Respect the requested CEFR level strictly.',
    'Do not copy protected worlds, names, characters, or plots.',
    'Keep memory updates compact and bounded.',
    'Memory arrays are strict caps: knownFacts <= 8, openQuestions <= 6, importantObjectsOrLocations <= 6, recurringStoryWordIds <= 24.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
    'Summaries and memory updates must describe only story events, never mention schema, prompts, corrections, or app mechanics.',
  ].join('\n');
}

// buildUserPrompt sends only bounded context and the learner answer.
function buildUserPrompt(
  payload: SubmitInteractionRequest,
  previousFailure?: string,
): string {
  return JSON.stringify(
    {
      task: 'submit-interaction',
      ...(previousFailure
        ? {
            retryInstruction:
              `The previous output failed validation: ${previousFailure}. Correct this issue in the new output.`,
          }
        : {}),
      requirements: {
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        interactionPrompt: payload.interactionPrompt,
        selectedChoiceId: payload.selectedChoiceId,
        selectedChoiceLabel: payload.selectedChoiceLabel,
        userReply: payload.userReply,
        interactionCount: payload.interactionCount,
        minimumInteractionsBeforeCompletion: 5,
        maximumInteractionsBeforeCompletion: 10,
        mustCompleteThisTurn: payload.interactionCount >= 10,
        remainingInteractionsBeforeHardStop: Math.max(
          10 - payload.interactionCount,
          0,
        ),
        typicalInteractionRange: '5-10',
        episodePacingStage: getEpisodePacingStage(payload.interactionCount),
        safetyAndCopyrightConstraints: payload.safetyAndCopyrightConstraints,
      },
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        episodeSummary: payload.episodeSummary,
        previousDecisions: payload.previousDecisions.slice(
          -PREVIOUS_DECISION_PROMPT_LIMIT,
        ),
      },
      outputRules: [
        'Return a JSON object with exactly these top-level fields: feedback, continuationText, continuationSentences, isEpisodeComplete, nextInteraction, cliffhanger, summaryUpdate, memoryUpdate.',
        'Use null for nextInteraction when isEpisodeComplete is true.',
        'Use null for cliffhanger when isEpisodeComplete is false.',
        'memoryUpdate must contain knownFacts, openQuestions, importantObjectsOrLocations, lastEpisodeSummary, unresolvedCliffhanger, recurringStoryWordIds, and may contain currentConflict.',
        'Do not copy the full previous memory into memoryUpdate. Return only the compact current state after this answer.',
        'memoryUpdate.knownFacts must contain no more than 8 concise facts.',
        'memoryUpdate.openQuestions must contain no more than 6 active questions.',
        'memoryUpdate.importantObjectsOrLocations must contain no more than 6 anchors.',
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
        'If isEpisodeComplete is false, return nextInteraction with two or three meaningful choices and omit cliffhanger.',
        'If isEpisodeComplete is true, omit nextInteraction and return a cliffhanger that motivates the next episode.',
        'Do not complete before interactionCount reaches 5.',
        'If interactionCount is 10 or higher, isEpisodeComplete must be true and nextInteraction must be null.',
        'If interactionCount is 1-2, build the setup and initial discovery without resolving the episode.',
        'If interactionCount is 3-4, escalate the local conflict and narrow the possible goal for the episode.',
        'If interactionCount is 5-7, move toward the episode goal and complete only if the mini-arc already has consequences and a closing beat.',
        'If interactionCount is 8-9, converge toward the final beat; avoid opening new unresolved branches unless they are next-episode hooks.',
        'If interactionCount is 10 or higher, write the episode-ending consequence now, set isEpisodeComplete true, and use cliffhanger for the next episode hook.',
        'After interaction 5, complete only when this episode has a coherent mini-arc, visible consequences, and a closing beat.',
        'memoryUpdate must not include full transcripts.',
        'Do not write meta text such as "The user chose" unless it is a natural story fact.',
        'Do not use asterisks, markdown emphasis, curly quotes, curly apostrophes, or ellipsis characters.',
        'Prefer natural collocations such as "growing curiosity", not unusual phrases such as "friendly curiosity".',
      ],
      responseExample:
        payload.interactionCount < 5
          ? {
              feedback:
                'Good choice. "Open the door carefully" sounds natural.',
              continuationText:
                'Mira turned the handle slowly. A narrow blue passage opened behind the door.',
              continuationSentences: [
                'Mira turned the handle slowly.',
                'A narrow blue passage opened behind the door.',
              ],
              isEpisodeComplete: false,
              nextInteraction: {
                kind: 'choice',
                prompt: 'What should Mira do next?',
                choices: [
                  {
                    id: 'choice:enter_passage',
                    label: 'Enter the passage carefully.',
                    outcomeHint: 'Mira explores the hidden passage.',
                  },
                  {
                    id: 'choice:call_leo',
                    label: 'Call Leo before going inside.',
                    outcomeHint: 'Mira brings Leo into the decision.',
                  },
                ],
              },
              cliffhanger: null,
              summaryUpdate:
                'Mira opened the hidden door and found a narrow blue passage.',
              memoryUpdate: {
                knownFacts: ['The hidden door opens into a blue passage.'],
                openQuestions: ['Where does the passage lead?'],
                importantObjectsOrLocations: ['hidden door', 'blue passage'],
                lastEpisodeSummary:
                  'Mira opened the hidden door and found a narrow blue passage.',
                unresolvedCliffhanger:
                  'The blue passage waits beyond the hidden door.',
                recurringStoryWordIds: [],
              },
            }
          : {
              feedback: 'Good choice. That answer sounds natural.',
              continuationText:
                'Mira followed the passage and found a small brass key under a library map.',
              continuationSentences: [
                'Mira followed the passage and found a small brass key under a library map.',
              ],
              isEpisodeComplete: true,
              nextInteraction: null,
              cliffhanger:
                'The brass key carried the same mark as another locked door.',
              summaryUpdate:
                'Mira explored the hidden passage and found a brass key under a library map.',
              memoryUpdate: {
                knownFacts: ['Mira found a brass key in the hidden passage.'],
                openQuestions: ['What does the brass key open?'],
                importantObjectsOrLocations: ['brass key', 'library map'],
                lastEpisodeSummary:
                  'Mira explored the hidden passage and found a brass key under a library map.',
                unresolvedCliffhanger:
                  'The brass key carried the same mark as another locked door.',
                recurringStoryWordIds: [],
              },
            },
    },
    null,
    2,
  );
}

// getEpisodePacingStage tells the model how to spend the remaining episode turns.
function getEpisodePacingStage(interactionCount: number): string {
  if (interactionCount <= 2) {
    return 'setup: establish the immediate situation and first discovery';
  }

  if (interactionCount <= 4) {
    return 'complication: escalate the local conflict and clarify the episode goal';
  }

  if (interactionCount <= 7) {
    return 'development: show consequences and move toward the episode goal';
  }

  if (interactionCount <= 9) {
    return 'convergence: prepare the closing beat and avoid new large branches';
  }

  return 'closing: end the current episode now and leave only a next-episode hook';
}
