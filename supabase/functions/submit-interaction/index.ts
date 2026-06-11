import { generateText } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';
import { z } from 'npm:zod';

import {
  submitInteractionRequestSchema,
  type InteractionPayload,
  type SubmitInteractionRequest,
} from '../_shared/episodeContracts.ts';
import { finalizeInteractionPayload } from '../_shared/episodeFinalizers.ts';
import {
  corsHeaders,
  moderationResponse,
  jsonResponse,
  logSafeError,
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

// PREVIOUS_DECISION_PROMPT_LIMIT keeps prompt context bounded for one episode.
const PREVIOUS_DECISION_PROMPT_LIMIT = 10;

// INTERACTION_LIMITS are the server-side episode pacing bounds.
const INTERACTION_LIMITS = {
  // minimumBeforeCompletion prevents short one-answer episodes.
  minimumBeforeCompletion: 5,
  // maximumBeforeCompletion forces the current episode to close.
  maximumBeforeCompletion: 10,
} as const;

// aiGenerationAttempts is the maximum model retry count for each structured step.
const aiGenerationAttempts = 3;

// DIRECT_SPEECH_TEXT_DRAFT_LIMIT accepts imperfect extraction drafts before frame splitting.
const DIRECT_SPEECH_TEXT_DRAFT_LIMIT = 1000;

// FINAL_CLIFFHANGER_LIMIT matches the response contract sent to mobile clients.
const FINAL_CLIFFHANGER_LIMIT = 300;

// sentenceFrameDraftSchema is the small AI contract for reader dialogue metadata.
const sentenceFrameDraftSchema = z.object({
  frames: z
    .array(
      z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('narration'),
          text: z.string().trim().min(1).max(280),
        }),
        z.object({
          kind: z.literal('dialogue'),
          speaker: z.string().trim().min(1).max(80),
          text: z.string().trim().min(1).max(280),
        }),
      ]),
    )
    .min(1)
    .max(8),
});

// directSpeechDraftSchema is the small AI contract for extracting spoken lines.
const directSpeechDraftSchema = z.object({
  directSpeech: z
    .array(
      z.object({
        speaker: z.string().trim().min(1).max(80),
        spokenText: z.string().trim().min(1).max(DIRECT_SPEECH_TEXT_DRAFT_LIMIT),
      }),
    )
    .max(8),
});

// choiceDraftSchema is the small AI contract for the next creative decision.
const choiceDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  choices: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        isSpeech: z.boolean().optional(),
      }),
    )
    .min(2)
    .max(3),
});

// translationDraftSchema is the small AI contract for Russian annotation translations.
const translationDraftSchema = z.object({
  translations: z
    .array(
      z.object({
        wordId: z.string().trim().min(1),
        sentenceIndex: z.number().int().nonnegative(),
        surfaceText: z.string().trim().min(1),
        translation: z.string().trim().min(1),
        transcription: z.string().trim().min(1).optional(),
      }),
    )
    .max(24),
});

// optionalDraftTextSchema accepts common model nulls for absent optional text.
const optionalDraftTextSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).optional(),
);

// memoryDraftSchema is the small AI contract for compact series memory updates.
const memoryDraftSchema = z.object({
  currentConflict: optionalDraftTextSchema,
  knownFacts: z.array(z.string().trim().min(1)).max(32),
  openQuestions: z.array(z.string().trim().min(1)).max(32),
  importantObjectsOrLocations: z.array(z.string().trim().min(1)).max(32),
  lastEpisodeSummary: z.string().trim().min(1).max(600),
  unresolvedCliffhanger: optionalDraftTextSchema.pipe(
    z.string().max(1000).optional(),
  ),
  recurringStoryWordIds: z.array(z.string().trim().min(1)).max(32),
});

// coreInteractionDraftSchema is the only creative story continuation contract.
const coreInteractionDraftSchema = z.object({
  feedback: z.string().trim().min(1).max(500),
  continuationText: z.string().trim().min(1).max(600),
  isEpisodeComplete: z.boolean(),
  cliffhanger: optionalDraftTextSchema.pipe(z.string().max(1000).optional()),
  summaryUpdate: z.string().trim().min(1).max(600),
});

// CoreInteractionDraft is the parsed result of the creative continuation step.
type CoreInteractionDraft = z.infer<typeof coreInteractionDraftSchema>;

// ChoiceDraft is the parsed result of the next decision step.
type ChoiceDraft = z.infer<typeof choiceDraftSchema>;

// SentenceFrameDraft is the parsed result of the reader-frame step.
type SentenceFrameDraft = z.infer<typeof sentenceFrameDraftSchema>;

// DirectSpeechDraft is the parsed result of the speech-extraction step.
type DirectSpeechDraft = z.infer<typeof directSpeechDraftSchema>;

// TranslationDraft is the parsed result of the annotation-translation step.
type TranslationDraft = z.infer<typeof translationDraftSchema>;

// MemoryDraft is the parsed result of the compact-memory step.
type MemoryDraft = z.infer<typeof memoryDraftSchema>;

// AnnotationTarget is a deterministic Story Word occurrence found in generated text.
type AnnotationTarget = {
  // wordId links the target to one selected Story Word.
  readonly wordId: string;
  // surfaceText is the exact word form found in a continuation sentence.
  readonly surfaceText: string;
  // sentenceIndex identifies the continuation sentence containing surfaceText.
  readonly sentenceIndex: number;
};

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
        'This account is currently blocked from continuing episodes.',
      );
    }

    const payload = parsedRequest.data;
    const moderationEntries = collectModerationEntries(payload);
    const moderationSignals = scanModerationEntries(moderationEntries);

    if (moderationSignals.length > 0) {
      const currentState = await moderationStore.getState(authResult.user.userId);
      const review = buildModerationReview({
        previousWarningCount: getEffectiveWarningCount(currentState),
        signals: moderationSignals,
      });

      await moderationStore.recordWarning(
        authResult.user.userId,
        'submit-interaction',
        review,
      );

      return moderationResponse(
        review.shouldBan ? 'banned' : 'warning',
        review.warningsRemaining,
        review.shouldBan
          ? 'This request matched blocked content rules again and the account has been banned.'
          : `This request matched blocked content rules. ${review.warningsRemaining} warning${review.warningsRemaining === 1 ? '' : 's'} remain before a ban.`,
      );
    }

    const validatedPayload = await generateValidatedInteraction(payload);

    return jsonResponse(validatedPayload);
  } catch (error) {
    logSafeError('submit-interaction AI generation failed', error, {
      model: openrouterModel,
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// generateValidatedInteraction builds the final app payload from smaller AI drafts.
async function generateValidatedInteraction(
  payload: SubmitInteractionRequest,
): Promise<ReturnType<typeof finalizeInteractionPayload>> {
  let finalizationError: Error | undefined;

  for (let attempt = 1; attempt <= aiGenerationAttempts; attempt += 1) {
    try {
      const coreDraft = await generateCoreDraft(payload, finalizationError);
      const isEpisodeComplete =
        coreDraft.isEpisodeComplete ||
        payload.interactionCount >= INTERACTION_LIMITS.maximumBeforeCompletion;
      const [directSpeechDraft, memoryDraft, choiceDraft] = await Promise.all([
        generateDirectSpeechDraft(payload, coreDraft),
        generateMemoryDraft(payload, coreDraft),
        isEpisodeComplete
          ? Promise.resolve<ChoiceDraft | undefined>(undefined)
          : generateChoiceDraft(payload, coreDraft),
      ]);
      const frameDraft = await generateSentenceFrameDraft(
        payload,
        coreDraft,
        directSpeechDraft,
      );
      const continuationSentences = extractFrameSentences(frameDraft);
      const annotationTargets = findAnnotationTargets({
        request: payload,
        sentences: continuationSentences,
      });
      const translationDraft = await generateTranslationDraft(
        payload,
        continuationSentences,
        annotationTargets,
      );
      const assembledPayload = assembleInteractionPayload({
        annotationTargets,
        choiceDraft,
        continuationSentences,
        coreDraft,
        frameDraft,
        isEpisodeComplete,
        memoryDraft,
        request: payload,
        translationDraft,
      });

      return finalizeInteractionPayload({
        payload: assembledPayload,
        request: payload,
      });
    } catch (error) {
      finalizationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('submit-interaction pipeline failed', finalizationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw finalizationError ?? new Error('Interaction finalization failed.');
}

// generateCoreDraft asks the model only for the creative story continuation.
async function generateCoreDraft(
  payload: SubmitInteractionRequest,
  previousFailure?: Error,
): Promise<CoreInteractionDraft> {
  const result = await generateJsonWithSchema({
    prompt: buildCorePrompt(payload, previousFailure?.message),
    schema: coreInteractionDraftSchema,
    system: buildCoreSystemPrompt(),
  });

  return result;
}

// generateDirectSpeechDraft asks the model only to extract spoken lines.
async function generateDirectSpeechDraft(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): Promise<DirectSpeechDraft> {
  return await generateJsonWithSchema({
    prompt: buildDirectSpeechPrompt(payload, coreDraft),
    schema: directSpeechDraftSchema,
    system: buildDirectSpeechSystemPrompt(),
  });
}

// generateSentenceFrameDraft asks for reader frames using extracted speech hints.
async function generateSentenceFrameDraft(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
  directSpeechDraft: DirectSpeechDraft,
): Promise<SentenceFrameDraft> {
  return await generateJsonWithSchema({
    prompt: buildFramePrompt(payload, coreDraft, directSpeechDraft),
    schema: sentenceFrameDraftSchema,
    system: buildFrameSystemPrompt(),
  });
}

// generateChoiceDraft asks for only the creative prompt and labels of the next turn.
async function generateChoiceDraft(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): Promise<ChoiceDraft> {
  return await generateJsonWithSchema({
    prompt: buildChoicePrompt(payload, coreDraft),
    schema: choiceDraftSchema,
    system: buildChoiceSystemPrompt(),
  });
}

// generateTranslationDraft asks for Russian translations for deterministic targets.
async function generateTranslationDraft(
  payload: SubmitInteractionRequest,
  sentences: readonly string[],
  targets: readonly AnnotationTarget[],
): Promise<TranslationDraft> {
  if (targets.length === 0) {
    return { translations: [] };
  }

  return await generateJsonWithSchema({
    prompt: buildTranslationPrompt(payload, sentences, targets),
    schema: translationDraftSchema,
    system: buildTranslationSystemPrompt(),
  });
}

// generateMemoryDraft asks the model only for compact continuity memory.
async function generateMemoryDraft(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): Promise<MemoryDraft> {
  return await generateJsonWithSchema({
    prompt: buildMemoryPrompt(payload, coreDraft),
    schema: memoryDraftSchema,
    system: buildMemorySystemPrompt(),
  });
}

// GenerateJsonInput describes one small structured AI call.
type GenerateJsonInput<TSchema extends z.ZodType> = {
  // prompt is the step-specific JSON instruction.
  readonly prompt: string;
  // schema validates the small model response before assembly.
  readonly schema: TSchema;
  // system is the step-specific behavior boundary.
  readonly system: string;
};

// generateJsonWithSchema runs one small JSON generation task with local retries.
async function generateJsonWithSchema<TSchema extends z.ZodType>({
  prompt,
  schema,
  system,
}: GenerateJsonInput<TSchema>): Promise<z.infer<TSchema>> {
  let validationError: Error | undefined;

  for (let attempt = 1; attempt <= aiGenerationAttempts; attempt += 1) {
    const result = await generateText({
      model: openrouterProvider!(openrouterModel),
      system,
      prompt: validationError
        ? `${prompt}\n\nPrevious validation error: ${validationError.message}\nRegenerate the entire JSON object from scratch and fix every invalid field.`
        : prompt,
      temperature: 0.2,
      maxOutputTokens: 1400,
    });

    try {
      return schema.parse(parseJsonObject(result.text));
    } catch (error) {
      validationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('submit-interaction step validation failed', validationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw validationError ?? new Error('AI JSON validation failed.');
}

// AssembleInteractionInput groups independently generated draft parts.
type AssembleInteractionInput = {
  // annotationTargets are deterministic word occurrences found by the server.
  readonly annotationTargets: readonly AnnotationTarget[];
  // choiceDraft is absent when the episode is complete.
  readonly choiceDraft?: ChoiceDraft;
  // continuationSentences are the semantic reader units produced by the frame step.
  readonly continuationSentences: string[];
  // coreDraft is the creative story continuation.
  readonly coreDraft: CoreInteractionDraft;
  // frameDraft contains reader sentence metadata.
  readonly frameDraft: SentenceFrameDraft;
  // isEpisodeComplete is the server-adjusted completion state.
  readonly isEpisodeComplete: boolean;
  // memoryDraft contains compact continuity state.
  readonly memoryDraft: MemoryDraft;
  // request provides existing memory when the model omits optional memory hints.
  readonly request: SubmitInteractionRequest;
  // translationDraft contains Russian translations for annotation targets.
  readonly translationDraft: TranslationDraft;
};

// assembleInteractionPayload compiles small drafts into the existing final contract.
function assembleInteractionPayload({
  annotationTargets,
  choiceDraft,
  continuationSentences,
  coreDraft,
  frameDraft,
  isEpisodeComplete,
  memoryDraft,
  request,
  translationDraft,
}: AssembleInteractionInput): InteractionPayload {
  const continuationText = continuationSentences.join(' ');
  const translationsByKey = new Map(
    translationDraft.translations.map((translation) => [
      annotationKey(translation),
      translation,
    ]),
  );
  const unresolvedCliffhanger =
    limitText(
      memoryDraft.unresolvedCliffhanger ??
        coreDraft.cliffhanger ??
        request.compactSeriesMemory.unresolvedCliffhanger ??
        coreDraft.summaryUpdate,
      FINAL_CLIFFHANGER_LIMIT,
    );
  const completionCliffhanger = coreDraft.cliffhanger
    ? limitText(coreDraft.cliffhanger, FINAL_CLIFFHANGER_LIMIT)
    : unresolvedCliffhanger;

  return {
    feedback: coreDraft.feedback,
    continuationText,
    continuationSentences,
    continuationSentenceFrames: frameDraft.frames,
    continuationAnnotations: annotationTargets.flatMap((target) => {
      const translation = translationsByKey.get(annotationKey(target));

      if (!translation) {
        return [];
      }

      return [
        {
          wordId: target.wordId,
          surfaceText: target.surfaceText,
          translation: translation.translation,
          ...(translation.transcription
            ? { transcription: translation.transcription }
            : {}),
          sentenceIndex: target.sentenceIndex,
        },
      ];
    }),
    isEpisodeComplete,
    ...(isEpisodeComplete
      ? { cliffhanger: completionCliffhanger }
      : {
          nextInteraction: {
            kind: 'choice',
            prompt: choiceDraft?.prompt ?? '',
            choices: (choiceDraft?.choices ?? []).map((choice, index) => ({
              id: createChoiceId(choice.label, index),
              label: choice.label,
              ...(choice.isSpeech === false ? { isSpeech: false } : {}),
            })),
          },
        }),
    summaryUpdate: coreDraft.summaryUpdate,
    memoryUpdate: {
      ...memoryDraft,
      lastEpisodeSummary: coreDraft.summaryUpdate,
      unresolvedCliffhanger,
    },
  };
}

// limitText keeps permissive draft fields inside the public response contract.
function limitText(value: string, maxLength: number): string {
  const normalizedValue = value.trim().replace(/\s+/g, ' ');

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  const sentenceBoundary = Math.max(
    normalizedValue.lastIndexOf('.', maxLength - 1),
    normalizedValue.lastIndexOf('?', maxLength - 1),
    normalizedValue.lastIndexOf('!', maxLength - 1),
  );
  const cutIndex =
    sentenceBoundary >= Math.floor(maxLength * 0.6)
      ? sentenceBoundary + 1
      : maxLength - 1;

  return `${normalizedValue.slice(0, cutIndex).trimEnd()}...`;
}

// extractFrameSentences makes AI semantic frames the source for reader playback.
function extractFrameSentences(frameDraft: SentenceFrameDraft): string[] {
  return frameDraft.frames.map((frame) => frame.text);
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

// findAnnotationTargets deterministically finds selected Story Words in new text.
function findAnnotationTargets({
  request,
  sentences,
}: {
  // request contains selected Story Words for this episode.
  readonly request: SubmitInteractionRequest;
  // sentences are the generated continuation sentences.
  readonly sentences: readonly string[];
}): AnnotationTarget[] {
  return request.selectedStoryWords.flatMap((word) =>
    sentences.flatMap((sentence, sentenceIndex) =>
      containsWord(sentence, word.word)
        ? [
            {
              wordId: word.id,
              surfaceText: word.word,
              sentenceIndex,
            },
          ]
        : [],
    ),
  );
}

// annotationKey gives translation targets and results a stable join key.
function annotationKey({
  sentenceIndex,
  surfaceText,
  wordId,
}: Pick<AnnotationTarget, 'sentenceIndex' | 'surfaceText' | 'wordId'>): string {
  return `${wordId}:${sentenceIndex}:${surfaceText.toLocaleLowerCase()}`;
}

// containsWord checks a selected headword as a complete case-insensitive token.
function containsWord(text: string, word: string): boolean {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`\\b${escapedWord}\\b`, 'i').test(text);
}

// createChoiceId makes deterministic local ids from AI-written labels.
function createChoiceId(label: string, index: number): string {
  const slug = label
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  return `choice:${slug || `option_${index + 1}`}`;
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

// buildCoreSystemPrompt keeps the creative story continuation focused.
function buildCoreSystemPrompt(): string {
  return [
    'You continue one interactive English-learning episode after the learner answers.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Generate only the creative story core: feedback, one continuation text, completion state, and summary.',
    'Do not generate choice ids, sentence frame metadata, inline annotations, or memory arrays in this step.',
    'Do not split continuation text into sentences in this step.',
    'Feedback must be one or two short sentences, story-friendly, and useful.',
    'If the learner answer is already natural and correct, confirm it and do not invent an error.',
    'Continuation text belongs to the same episode, not a new episode.',
    'An episode normally contains 5-10 meaningful learner interactions.',
    'Never complete an episode before the fifth learner interaction.',
    'At the tenth learner interaction, you must complete the current episode.',
    'Pace every continuation toward ending the current episode inside 5-10 learner interactions.',
    'Respect the requested CEFR level strictly.',
    'Do not copy protected worlds, names, characters, or plots.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
  ].join('\n');
}

// buildMemorySystemPrompt keeps compact memory generation separate from story prose.
function buildMemorySystemPrompt(): string {
  return [
    'You update compact continuity memory for a personal English-learning series.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Use only the provided continuation, summary, cliffhanger, previous decisions, and previous compact memory.',
    'Keep memory arrays concise and high-signal.',
    'Do not include full transcripts, schema language, prompts, or app mechanics.',
  ].join('\n');
}

// buildDirectSpeechSystemPrompt keeps spoken-line extraction separate from framing.
function buildDirectSpeechSystemPrompt(): string {
  return [
    'You extract direct speech from already-written episode continuation text.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return only actual words spoken aloud by a character.',
    'Do not return narration, thoughts, feelings, actions, or attribution words such as said, asked, or whispered.',
    'If speech is embedded inside narration, extract only the spoken words and the best visible speaker.',
    'Preserve separate spoken segments in source order; do not merge adjacent turns by the same speaker.',
    'Prefer short spokenText values under 220 characters; split longer speech at sentence boundaries.',
    'If there is no direct speech, return an empty directSpeech array.',
    'Return spokenText without quotation marks or attribution.',
    'Use plain ASCII punctuation and no Markdown.',
  ].join('\n');
}

// buildFrameSystemPrompt keeps the sentence-frame task narrow and non-creative.
function buildFrameSystemPrompt(): string {
  return [
    'You split already-written episode continuation text into semantic reader frames.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Preserve the original meaning, event order, dialogue intent, and CEFR simplicity.',
    'Do not add new story events, choices, feedback, explanations, or translations.',
    'Each frame must contain text.',
    'Use the provided directSpeech list to split embedded speech out of narration.',
    'Dialogue frame text must contain only the spoken words and no quotation marks.',
    'Narration frame text must contain surrounding action, attribution, description, and non-spoken text.',
    'If a source sentence mixes narration and speech, split it into narration and dialogue frames.',
    'If consecutive lines are spoken by the same speaker, keep them as adjacent dialogue frames; the server will merge them for playback.',
    'Do not create dialogue frames that are not supported by directSpeech or an obvious standalone quote in continuationText.',
    'If you are unsure whether text is spoken aloud, use narration.',
    'Return 1-8 frames suitable for sentence-by-sentence reading and audio playback.',
  ].join('\n');
}

// buildChoiceSystemPrompt keeps the next-decision task narrow but creative.
function buildChoiceSystemPrompt(): string {
  return [
    'You write the next learner choice for an interactive English-learning episode.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return only prompt and two or three creative choices.',
    'Do not generate ids or kind fields.',
    'Choices must be meaningful, story-specific, and help the episode move toward closure.',
    'Set isSpeech false only when a choice is a non-spoken physical action or internal decision.',
  ].join('\n');
}

// buildParticipationRules keeps every continuation aligned with the saved series mode.
function buildParticipationRules(
  payload: Pick<SubmitInteractionRequest, 'participationMode' | 'compactSeriesMemory'>,
): readonly string[] {
  if (payload.participationMode === 'character') {
    return [
      `The learner is inside the story as: ${payload.compactSeriesMemory.userRole}.`,
      'Interpret the learner answer as that character speech, action, plan, or question.',
      'Next choices must be in-character actions or speech for the learner role.',
      'Do not ask the learner to decide unrelated characters actions like an outside author.',
    ];
  }

  return [
    'The learner is outside the story as a story director.',
    'Interpret the learner answer as direction for how events should unfold.',
    'Next choices may direct scene events, character decisions, or story consequences.',
    'Do not address the learner as a physical character inside the story.',
  ];
}

// buildTranslationSystemPrompt keeps annotation generation bounded to exact targets.
function buildTranslationSystemPrompt(): string {
  return [
    'You translate exact English word targets into Russian for inline learner hints.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return one translation for each provided target.',
    'Do not invent new targets, sentence indexes, surface text, or word ids.',
    'Translations must be Russian Cyrillic, concise, and context-aware.',
  ].join('\n');
}

// buildCorePrompt sends bounded context for the creative continuation step.
function buildCorePrompt(
  payload: SubmitInteractionRequest,
  previousFailure?: string,
): string {
  return JSON.stringify(
    {
      task: 'submit-interaction-core',
      ...(previousFailure
        ? {
            retryInstruction:
              `The previous assembled output failed validation: ${previousFailure}. Regenerate the core JSON from scratch with fields that support a valid final payload.`,
          }
        : {}),
      requirements: {
        seriesTitle: payload.seriesTitle,
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        participationMode: payload.participationMode,
        participationRules: buildParticipationRules(payload),
        interactionPrompt: payload.interactionPrompt,
        selectedChoiceLabel: payload.selectedChoiceLabel,
        userReply: payload.userReply,
        selectedStoryWords: payload.selectedStoryWords,
        encounteredStoryWordIds: payload.encounteredStoryWordIds,
        remainingStoryWords: payload.selectedStoryWords.filter(
          (word) => !payload.encounteredStoryWordIds.includes(word.id),
        ),
        interactionCount: payload.interactionCount,
        minimumInteractionsBeforeCompletion:
          INTERACTION_LIMITS.minimumBeforeCompletion,
        maximumInteractionsBeforeCompletion:
          INTERACTION_LIMITS.maximumBeforeCompletion,
        mustCompleteThisTurn:
          payload.interactionCount >= INTERACTION_LIMITS.maximumBeforeCompletion,
        remainingInteractionsBeforeHardStop: Math.max(
          INTERACTION_LIMITS.maximumBeforeCompletion - payload.interactionCount,
          0,
        ),
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
        'Return exactly these top-level fields: feedback, continuationText, isEpisodeComplete, cliffhanger, summaryUpdate.',
        'continuationText must be the only story text. Do not return continuationSentences.',
        'continuationText must be one coherent paragraph or short passage for this turn.',
        'Do not split continuationText into an array.',
        'Use 1-2 remainingStoryWords naturally when possible, especially before interaction 8.',
        'Do not force all remainingStoryWords into one continuation.',
        'If isEpisodeComplete is false, omit cliffhanger.',
        'If isEpisodeComplete is true, include cliffhanger.',
        'Do not complete before interactionCount reaches 5.',
        'If interactionCount is 10 or higher, isEpisodeComplete must be true.',
        'Do not return memoryUpdate.',
        ...buildParticipationRules(payload),
      ],
    },
    null,
    2,
  );
}

// buildDirectSpeechPrompt sends continuation text for spoken-line extraction only.
function buildDirectSpeechPrompt(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): string {
  return JSON.stringify(
    {
      task: 'extract-direct-speech',
      cefr: payload.cefrLevel,
      continuationText: coreDraft.continuationText,
      outputRules: [
        'Return { "directSpeech": [...] }.',
        'Each item must include speaker and spokenText.',
        'spokenText must be only what the character says aloud, without quotation marks.',
        'speaker must be the visible speaker name when available.',
        'For text like Mira whispered open it, return speaker "Mira" and spokenText "Open it".',
        'If one character speaks several sentences, return several adjacent items with the same speaker instead of one long spokenText.',
        'Do not include narration such as "Mira whispered" in spokenText.',
        'Do not invent speech that is not present in continuationText.',
      ],
    },
    null,
    2,
  );
}

// buildFramePrompt sends exact continuation sentences for frame labeling.
function buildFramePrompt(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
  directSpeechDraft: DirectSpeechDraft,
): string {
  return JSON.stringify(
    {
      task: 'split-continuation-into-reader-frames',
      cefr: payload.cefrLevel,
      continuationText: coreDraft.continuationText,
      directSpeech: directSpeechDraft.directSpeech,
      outputRules: [
        'Return { "frames": [...] }.',
        'Each frame must include kind and text.',
        'Dialogue frames must also include speaker.',
        'Dialogue frame text must be spokenText from directSpeech without quotation marks.',
        'Narration frame text must be natural reader text, not labels or summaries.',
        'Split on semantic sentence boundaries and dialogue turns.',
        'Separate embedded speech from attribution: Mira whispered open it should become narration Mira whispered. and dialogue Open it.',
        'If consecutive lines are spoken by the same speaker, keep them as adjacent dialogue frames; the server will merge them for playback.',
        'Do not omit any meaningful story information from continuationText.',
        'Do not invent information that is not present in continuationText.',
      ],
    },
    null,
    2,
  );
}

// buildMemoryPrompt sends bounded story state for compact memory only.
function buildMemoryPrompt(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): string {
  return JSON.stringify(
    {
      task: 'update-interaction-memory',
      seriesTitle: payload.seriesTitle,
      continuationText: coreDraft.continuationText,
      summaryUpdate: coreDraft.summaryUpdate,
      isEpisodeComplete: coreDraft.isEpisodeComplete,
      cliffhanger: coreDraft.cliffhanger,
      selectedStoryWordIds: payload.selectedStoryWords.map((word) => word.id),
      participationMode: payload.participationMode,
      participationRules: buildParticipationRules(payload),
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        episodeSummary: payload.episodeSummary,
        previousDecisions: payload.previousDecisions.slice(
          -PREVIOUS_DECISION_PROMPT_LIMIT,
        ),
      },
      outputRules: [
        'Return exactly these fields: currentConflict, knownFacts, openQuestions, importantObjectsOrLocations, lastEpisodeSummary, unresolvedCliffhanger, recurringStoryWordIds.',
        'lastEpisodeSummary must match summaryUpdate.',
        'If cliffhanger is present, unresolvedCliffhanger should match it.',
        'If cliffhanger is absent, unresolvedCliffhanger should preserve or update the active unresolved hook.',
        'knownFacts should contain no more than 8 high-signal facts.',
        'openQuestions should contain no more than 6 active questions.',
        'importantObjectsOrLocations should contain no more than 6 recurring anchors.',
        'recurringStoryWordIds should include selected Story Word ids that matter for continuity.',
      ],
    },
    null,
    2,
  );
}

// buildChoicePrompt sends the story state needed for the next decision.
function buildChoicePrompt(
  payload: SubmitInteractionRequest,
  coreDraft: CoreInteractionDraft,
): string {
  return JSON.stringify(
    {
      task: 'write-next-interaction-choice',
      cefr: payload.cefrLevel,
      seriesTitle: payload.seriesTitle,
      tone: payload.tone,
      participationMode: payload.participationMode,
      participationRules: buildParticipationRules(payload),
      interactionCount: payload.interactionCount,
      episodePacingStage: getEpisodePacingStage(payload.interactionCount),
      episodeSummaryAfterContinuation: coreDraft.summaryUpdate,
      continuationText: coreDraft.continuationText,
      previousDecisions: payload.previousDecisions.slice(
        -PREVIOUS_DECISION_PROMPT_LIMIT,
      ),
      outputRules: [
        'Return { "prompt": string, "choices": [{ "label": string, "isSpeech": boolean }] }.',
        'Return two or three choices.',
        'Do not include ids or kind.',
        'Choices must be short, concrete, and story-specific.',
        'Choices must move this episode toward a closing beat inside 5-10 interactions.',
        ...buildParticipationRules(payload),
      ],
    },
    null,
    2,
  );
}

// buildTranslationPrompt sends deterministic annotation targets for translation only.
function buildTranslationPrompt(
  payload: SubmitInteractionRequest,
  sentences: readonly string[],
  targets: readonly AnnotationTarget[],
): string {
  return JSON.stringify(
    {
      task: 'translate-annotation-targets',
      cefr: payload.cefrLevel,
      continuationSentences: sentences,
      targets,
      outputRules: [
        'Return { "translations": [...] }.',
        'Return at most one item per target.',
        'Each item must repeat wordId, sentenceIndex, and surfaceText exactly from a target.',
        'translation must be Russian Cyrillic.',
      ],
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
