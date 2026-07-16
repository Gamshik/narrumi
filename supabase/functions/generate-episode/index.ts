import { generateText } from 'npm:ai';
import { createOpenAI } from 'npm:@ai-sdk/openai';
import { z } from 'npm:zod';

import {
  generateEpisodeRequestSchema,
  episodePayloadSchema,
  type EpisodePayload,
  type GenerateEpisodeRequest,
} from '../_shared/episodeContracts.ts';
import { finalizeEpisodePayload } from '../_shared/episodeFinalizers.ts';
import {
  corsHeaders,
  generationStateResponse,
  moderationResponse,
  jsonResponse,
  logSafeError,
  safeErrorResponse,
} from '../_shared/http.ts';
import { runIdempotentGeneration } from '../_shared/generationIdempotency.ts';
import {
  assertEpisodeGenerationAllowed,
  EpisodeGenerationPolicyError,
} from '../_shared/episodeGenerationPolicy.ts';
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

// aiGenerationAttempts is the maximum model retry count for each structured step.
const aiGenerationAttempts = 3;

// DIRECT_SPEECH_TEXT_DRAFT_LIMIT accepts imperfect extraction drafts before frame splitting.
const DIRECT_SPEECH_TEXT_DRAFT_LIMIT = 1000;

// FINAL_CLIFFHANGER_LIMIT matches the response contract sent to mobile clients.
const FINAL_CLIFFHANGER_LIMIT = 300;

// optionalDraftTextSchema accepts common model nulls for absent optional text.
const optionalDraftTextSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).optional(),
);

// coreEpisodeDraftSchema is the small AI contract for the creative opening scene.
const coreEpisodeDraftSchema = z.object({
  title: optionalDraftTextSchema.pipe(z.string().max(80).optional()),
  previouslyRecap: optionalDraftTextSchema.pipe(z.string().max(400).optional()),
  sceneText: z.string().trim().min(1).max(1800),
  cliffhanger: z.string().trim().min(1).max(1000),
  summaryUpdate: z.string().trim().min(1).max(600),
});

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
    .min(3)
    .max(16),
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
    .max(16),
});

// interactionDraftSchema is the small AI contract for the first learner decision.
const interactionDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(300),
  choices: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        isSpeech: z.boolean().optional(),
        outcomeHint: optionalDraftTextSchema.pipe(z.string().max(240).optional()),
      }),
    )
    .min(2)
    .max(3),
});

// memoryDraftSchema is the small AI contract for compact series memory updates.
const memoryDraftSchema = z.object({
  currentConflict: optionalDraftTextSchema.pipe(z.string().max(300).optional()),
  knownFacts: z.array(z.string().trim().min(1)).max(32),
  openQuestions: z.array(z.string().trim().min(1)).max(32),
  importantObjectsOrLocations: z.array(z.string().trim().min(1)).max(32),
  lastEpisodeSummary: z.string().trim().min(1).max(600),
  unresolvedCliffhanger: z.string().trim().min(1).max(1000),
  recurringStoryWordIds: z.array(z.string().trim().min(1)).max(32),
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
        transcription: optionalDraftTextSchema.pipe(z.string().max(100).optional()),
      }),
    )
    .max(24),
});

// CoreEpisodeDraft is the parsed result of the creative opening step.
type CoreEpisodeDraft = z.infer<typeof coreEpisodeDraftSchema>;

// SentenceFrameDraft is the parsed result of the reader-frame step.
type SentenceFrameDraft = z.infer<typeof sentenceFrameDraftSchema>;

// DirectSpeechDraft is the parsed result of the speech-extraction step.
type DirectSpeechDraft = z.infer<typeof directSpeechDraftSchema>;

// InteractionDraft is the parsed result of the first-decision step.
type InteractionDraft = z.infer<typeof interactionDraftSchema>;

// MemoryDraft is the parsed result of the compact-memory step.
type MemoryDraft = z.infer<typeof memoryDraftSchema>;

// TranslationDraft is the parsed result of the annotation-translation step.
type TranslationDraft = z.infer<typeof translationDraftSchema>;

// AnnotationTarget is a deterministic Story Word occurrence found in generated text.
type AnnotationTarget = {
  // wordId links the target to one selected Story Word.
  readonly wordId: string;
  // surfaceText is the exact word form found in a scene sentence.
  readonly surfaceText: string;
  // sentenceIndex identifies the scene sentence containing surfaceText.
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
  const parsedRequest = generateEpisodeRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError('generate-episode request validation failed', parsedRequest.error, {
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
        'This account is currently blocked from generating new episodes.',
      );
    }

    const payload = normalizeGenerationRequest(parsedRequest.data);
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
        'generate-episode',
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

    const { generationRequestId: _generationRequestId, ...fingerprintPayload } =
      parsedRequest.data;
    const generationResult = await runIdempotentGeneration({
      generate: async () => {
        await assertEpisodeGenerationAllowed({
          authorization,
          orderIndex: payload.orderIndex,
          seriesId: payload.seriesId,
          userId: authResult.user.userId,
        });

        return generateValidatedEpisode(payload);
      },
      operation: 'generate-episode',
      parseResponse: (value) => episodePayloadSchema.parse(value),
      requestId: parsedRequest.data.generationRequestId,
      requestPayload: fingerprintPayload,
      scopeId: `${payload.seriesId}:${payload.orderIndex}`,
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
    if (error instanceof EpisodeGenerationPolicyError) {
      return generationStateResponse(error.kind);
    }

    logSafeError('generate-episode AI generation failed', error, {
      model: openrouterModel,
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// generateValidatedEpisode builds the final app payload from smaller AI drafts.
async function generateValidatedEpisode(
  payload: GenerateEpisodeRequest,
): Promise<ReturnType<typeof finalizeEpisodePayload>> {
  let finalizationError: Error | undefined;

  for (let attempt = 1; attempt <= aiGenerationAttempts; attempt += 1) {
    try {
      const coreDraft = await generateCoreDraft(payload, finalizationError);
      const [directSpeechDraft, interactionDraft, memoryDraft] = await Promise.all([
        generateDirectSpeechDraft(payload, coreDraft),
        generateInteractionDraft(payload, coreDraft),
        generateMemoryDraft(payload, coreDraft),
      ]);
      const frameDraft = await generateSentenceFrameDraft(
        payload,
        coreDraft,
        directSpeechDraft,
      );
      const sentences = extractFrameSentences(frameDraft);
      const annotationTargets = findAnnotationTargets({
        request: payload,
        sentences,
      });
      const translationDraft = await generateTranslationDraft(
        payload,
        sentences,
        annotationTargets,
      );
      const assembledPayload = assembleEpisodePayload({
        annotationTargets,
        coreDraft,
        frameDraft,
        interactionDraft,
        memoryDraft,
        request: payload,
        sentences,
        translationDraft,
      });

      return finalizeEpisodePayload({
        payload: assembledPayload,
        request: payload,
      });
    } catch (error) {
      finalizationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('generate-episode pipeline failed', finalizationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw finalizationError ?? new Error('Episode finalization failed.');
}

// generateCoreDraft asks the model only for the creative opening scene.
async function generateCoreDraft(
  payload: GenerateEpisodeRequest,
  previousFailure?: Error,
): Promise<CoreEpisodeDraft> {
  return await generateJsonWithSchema({
    prompt: buildCorePrompt(payload, previousFailure?.message),
    schema: coreEpisodeDraftSchema,
    system: buildCoreSystemPrompt(),
  });
}

// generateDirectSpeechDraft asks the model only to extract spoken lines.
async function generateDirectSpeechDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): Promise<DirectSpeechDraft> {
  return await generateJsonWithSchema({
    prompt: buildDirectSpeechPrompt(payload, coreDraft),
    schema: directSpeechDraftSchema,
    system: buildDirectSpeechSystemPrompt(),
  });
}

// generateSentenceFrameDraft asks the model to split the scene for reader playback.
async function generateSentenceFrameDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
  directSpeechDraft: DirectSpeechDraft,
): Promise<SentenceFrameDraft> {
  return await generateJsonWithSchema({
    prompt: buildFramePrompt(payload, coreDraft, directSpeechDraft),
    schema: sentenceFrameDraftSchema,
    system: buildFrameSystemPrompt(),
  });
}

// generateInteractionDraft asks the model only for the first learner decision.
async function generateInteractionDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): Promise<InteractionDraft> {
  return await generateJsonWithSchema({
    prompt: buildInteractionPrompt(payload, coreDraft),
    schema: interactionDraftSchema,
    system: buildInteractionSystemPrompt(),
  });
}

// generateMemoryDraft asks the model only for compact continuity memory.
async function generateMemoryDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): Promise<MemoryDraft> {
  return await generateJsonWithSchema({
    prompt: buildMemoryPrompt(payload, coreDraft),
    schema: memoryDraftSchema,
    system: buildMemorySystemPrompt(),
  });
}

// generateTranslationDraft asks for Russian translations for deterministic targets.
async function generateTranslationDraft(
  payload: GenerateEpisodeRequest,
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
      temperature: 0.3,
      maxOutputTokens: 1600,
    });

    try {
      return schema.parse(parseJsonObject(result.text));
    } catch (error) {
      validationError =
        error instanceof Error ? error : new Error(String(error));

      logSafeError('generate-episode step validation failed', validationError, {
        attempt: String(attempt),
        model: openrouterModel,
      });
    }
  }

  throw validationError ?? new Error('AI JSON validation failed.');
}

// AssembleEpisodeInput groups independently generated draft parts.
type AssembleEpisodeInput = {
  // annotationTargets are deterministic word occurrences found by the server.
  readonly annotationTargets: readonly AnnotationTarget[];
  // coreDraft is the creative opening scene.
  readonly coreDraft: CoreEpisodeDraft;
  // frameDraft contains reader sentence metadata.
  readonly frameDraft: SentenceFrameDraft;
  // interactionDraft contains the first learner decision.
  readonly interactionDraft: InteractionDraft;
  // memoryDraft contains compact continuity state.
  readonly memoryDraft: MemoryDraft;
  // request provides trusted selected Story Word ids.
  readonly request: GenerateEpisodeRequest;
  // sentences are the semantic reader units produced by the frame step.
  readonly sentences: string[];
  // translationDraft contains Russian translations for annotation targets.
  readonly translationDraft: TranslationDraft;
};

// assembleEpisodePayload compiles small drafts into the existing final contract.
function assembleEpisodePayload({
  annotationTargets,
  coreDraft,
  frameDraft,
  interactionDraft,
  memoryDraft,
  request,
  sentences,
  translationDraft,
}: AssembleEpisodeInput): EpisodePayload {
  const cliffhanger = limitText(coreDraft.cliffhanger, FINAL_CLIFFHANGER_LIMIT);
  const translationsByKey = new Map(
    translationDraft.translations.map((translation) => [
      annotationKey(translation),
      translation,
    ]),
  );

  return {
    ...(coreDraft.previouslyRecap
      ? { previouslyRecap: coreDraft.previouslyRecap }
      : {}),
    ...(coreDraft.title ? { title: coreDraft.title } : {}),
    sceneText: sentences.join(' '),
    sentences,
    sentenceFrames: frameDraft.frames,
    storyWordIds: request.selectedStoryWords.map((word) => word.id),
    annotations: annotationTargets.flatMap((target) => {
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
    interaction: {
      kind: 'choice',
      prompt: interactionDraft.prompt,
      choices: interactionDraft.choices.map((choice, index) => ({
        id: createChoiceId(choice.label, index),
        label: choice.label,
        ...(choice.isSpeech === false ? { isSpeech: false } : {}),
        ...(choice.outcomeHint ? { outcomeHint: choice.outcomeHint } : {}),
      })),
    },
    cliffhanger,
    summaryUpdate: coreDraft.summaryUpdate,
    memoryUpdate: {
      ...memoryDraft,
      lastEpisodeSummary: coreDraft.summaryUpdate,
      unresolvedCliffhanger: cliffhanger,
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

// normalizeGenerationRequest removes stale or unsuitable Story Words before model prompting.
function normalizeGenerationRequest(
  payload: GenerateEpisodeRequest,
): GenerateEpisodeRequest {
  return {
    ...payload,
    selectedStoryWords: payload.selectedStoryWords.filter((word) =>
      isStoryWordCandidate({
        maxLevel: payload.cefrLevel,
        partOfSpeech: word.partOfSpeech,
        level: word.level,
        word: word.word,
      })
    ),
  };
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
  readonly request: GenerateEpisodeRequest;
  // sentences are the generated opening scene sentences.
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
    logSafeError('generate-episode JSON parsing failed', error, {
      model: openrouterModel,
    });

    return undefined;
  }
}

// buildCoreSystemPrompt keeps generation rules server-side and schema-oriented.
function buildCoreSystemPrompt(): string {
  return [
    'You write the opening scene of an interactive English-learning episode.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Generate only the creative opening core: title, optional recap, sceneText, cliffhanger, and summaryUpdate.',
    'Do not generate sentence arrays, sentence frames, interaction choices, annotations, translations, or memory arrays in this step.',
    'Write original stories only. Do not copy protected worlds, names, characters, or plots.',
    'Respect the requested CEFR level strictly.',
    'Use selected Story Words naturally across the whole episode arc.',
    'Use only some selected Story Words in the initial scene when the set is large.',
    'Keep the scene concise enough for mobile reading but substantial enough to set up a meaningful first decision.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
    'Summaries must describe only story events, never mention schema, interaction points, prompts, or app mechanics.',
  ].join('\n');
}

// buildDirectSpeechSystemPrompt keeps spoken-line extraction separate from framing.
function buildDirectSpeechSystemPrompt(): string {
  return [
    'You extract direct speech from already-written episode text.',
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
    'You split already-written episode scene text into semantic reader frames.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Preserve the original meaning, event order, dialogue intent, and CEFR simplicity.',
    'Do not add new story events, choices, feedback, explanations, or translations.',
    'Each frame must contain text.',
    'Use the provided directSpeech list to split embedded speech out of narration.',
    'Dialogue frame text must contain only the spoken words and no quotation marks.',
    'Narration frame text must contain surrounding action, attribution, description, and non-spoken text.',
    'If a source sentence mixes narration and speech, split it into narration and dialogue frames.',
    'If consecutive lines are spoken by the same speaker, keep them as adjacent dialogue frames; the server will merge them for playback.',
    'Do not create dialogue frames that are not supported by directSpeech or an obvious standalone quote in sceneText.',
    'If you are unsure whether text is spoken aloud, use narration.',
    'Return 3-16 frames suitable for sentence-by-sentence reading and audio playback.',
  ].join('\n');
}

// buildInteractionSystemPrompt keeps the first-decision task narrow but creative.
function buildInteractionSystemPrompt(): string {
  return [
    'You write the first learner choice for an interactive English-learning episode.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return only prompt and two or three choices.',
    'Do not generate ids, kind fields, story text, memory, or annotations.',
    'Choices must be meaningful, story-specific, and not quizzes.',
    'Set isSpeech false only when a choice is a non-spoken physical action or internal decision.',
  ].join('\n');
}

// buildParticipationRules keeps learner agency consistent with the saved series setup.
function buildParticipationRules(
  payload: Pick<GenerateEpisodeRequest, 'participationMode' | 'userRole'>,
): readonly string[] {
  if (payload.participationMode === 'character') {
    return [
      `The learner is inside the story as: ${payload.userRole}.`,
      'Interaction prompts must address what the learner says or does in that role.',
      'Choices must be in-character actions or speech for the learner role.',
      'Do not ask the learner to decide unrelated characters actions like an outside author.',
    ];
  }

  return [
    'The learner is outside the story as a story director.',
    'Interaction prompts must ask how events should unfold or what a character should do next.',
    'Choices may direct scene events, character decisions, or story consequences.',
    'Do not address the learner as a physical character inside the story.',
  ];
}

// buildMemorySystemPrompt keeps compact memory generation separate from story prose.
function buildMemorySystemPrompt(): string {
  return [
    'You update compact continuity memory for a personal English-learning series.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Use only the provided scene, summary, cliffhanger, and previous compact memory.',
    'Keep memory arrays concise and high-signal.',
    'Do not include full transcripts, schema language, prompts, or app mechanics.',
  ].join('\n');
}

// buildTranslationSystemPrompt keeps annotation generation bounded to exact targets.
function buildTranslationSystemPrompt(): string {
  return [
    'You translate exact English word targets into Russian for inline learner hints.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return one translation for each provided target.',
    'Do not invent new targets, sentence indexes, surface text, or word ids.',
    'Translations must be Russian Cyrillic, concise, and context-aware.',
    'Never output broken mojibake text such as "Ð»Ñ" or "ÑÐ".',
  ].join('\n');
}

// buildCorePrompt sends bounded context required by the PRD and architecture.
function buildCorePrompt(
  payload: GenerateEpisodeRequest,
  previousFailure?: string,
): string {
  return JSON.stringify(
    {
      task: 'generate-episode-core',
      ...(previousFailure
        ? {
            retryInstruction:
              `The previous assembled output failed validation: ${previousFailure}. Regenerate the core JSON from scratch with fields that support a valid final payload.`,
          }
        : {}),
      requirements: {
        seriesTitle: payload.seriesTitle,
        episodeLength:
          'Keep the opening concise enough for a comfortable mobile learning session, but substantial enough to develop the scene and lead to a meaningful interaction. Do not target or enforce a fixed word-count range.',
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        premise: payload.premise,
        participationMode: payload.participationMode,
        participationRules: buildParticipationRules(payload),
        mainCharacters: payload.mainCharacters,
        characterProfiles: payload.characterProfiles,
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
        'Return exactly these top-level fields: title, previouslyRecap, sceneText, cliffhanger, summaryUpdate.',
        'If providing previouslyRecap, keep it very short (under 300 characters).',
        'Keep the title short (under 60 characters).',
        'The title field names only this specific episode and must express its central event, discovery, conflict, or decision.',
        'Treat seriesTitle as story context only. Never copy, repeat, paraphrase, prefix, or suffix seriesTitle inside the episode title.',
        'Never combine seriesTitle and the episode title with a colon, dash, slash, pipe, parentheses, or any other separator.',
        'The episode title must stand on its own without a series label or episode number.',
        'sceneText must be one coherent opening scene or short passage.',
        'Do not return sentences, sentenceFrames, annotations, interaction, or memoryUpdate.',
        'Use 2-4 selected Story Words in the initial scene, or fewer when the selected set is smaller.',
        'Do not force all selected Story Words into the initial scene; unused words can appear in later submit-interaction continuations.',
        'When using a selected Story Word, use the exact selected dictionary form in scene text.',
        'Use characterProfiles[].description for personality and role context.',
        'When writing direct speech for a pinned character, the later dialogue speaker label must be exactly characterProfiles[].name, not a title or description.',
        'cliffhanger must create a clear reason to continue this episode with a learner decision.',
        'summaryUpdate must summarize the story state after this opening scene. Keep it concise (under 500 characters).',
        'Do not write meta text such as "Added interaction point" or "The episode introduces".',
        'Do not use asterisks, markdown emphasis, curly quotes, curly apostrophes, or ellipsis characters.',
        ...buildParticipationRules(payload),
      ],
    },
    null,
    2,
  );
}

// buildFramePrompt sends scene text for semantic reader segmentation.
function buildDirectSpeechPrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): string {
  return JSON.stringify(
    {
      task: 'extract-direct-speech',
      cefr: payload.cefrLevel,
      characterProfiles: payload.characterProfiles,
      sceneText: coreDraft.sceneText,
      outputRules: [
        'Return { "directSpeech": [...] }.',
        'Each item must include speaker and spokenText.',
        'spokenText must be only what the character says aloud, without quotation marks.',
        'speaker must be the visible speaker name when available.',
        'For pinned characters, speaker must exactly match characterProfiles[].name. Use "Corbin", not "Detective Corbin", when the pinned name is "Corbin".',
        'For text like Mira whispered open it, return speaker "Mira" and spokenText "Open it".',
        'If one character speaks several sentences, return several adjacent items with the same speaker instead of one long spokenText.',
        'Do not include narration such as "Mira whispered" in spokenText.',
        'Do not invent speech that is not present in sceneText.',
      ],
    },
    null,
    2,
  );
}

// buildFramePrompt sends scene text for semantic reader segmentation.
function buildFramePrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
  directSpeechDraft: DirectSpeechDraft,
): string {
  return JSON.stringify(
    {
      task: 'split-scene-into-reader-frames',
      cefr: payload.cefrLevel,
      characterProfiles: payload.characterProfiles,
      sceneText: coreDraft.sceneText,
      directSpeech: directSpeechDraft.directSpeech,
      outputRules: [
        'Return { "frames": [...] }.',
        'Each frame must include kind and text.',
        'Dialogue frames must also include speaker.',
        'For pinned characters, speaker must exactly match characterProfiles[].name. Do not include titles, roles, or descriptions in speaker.',
        'Dialogue frame text must be spokenText from directSpeech without quotation marks.',
        'Narration frame text must be natural reader text, not labels or summaries.',
        'Split on semantic sentence boundaries and dialogue turns.',
        'Separate embedded speech from attribution: Mira whispered open it should become narration Mira whispered. and dialogue Open it.',
        'If consecutive lines are spoken by the same speaker, keep them as adjacent dialogue frames; the server will merge them for playback.',
        'Do not omit any meaningful story information from sceneText.',
        'Do not invent information that is not present in sceneText.',
      ],
    },
    null,
    2,
  );
}

// buildInteractionPrompt sends the story state needed for the first decision.
function buildInteractionPrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): string {
  return JSON.stringify(
    {
      task: 'write-first-interaction-choice',
      cefr: payload.cefrLevel,
      seriesTitle: payload.seriesTitle,
      tone: payload.tone,
      participationMode: payload.participationMode,
      participationRules: buildParticipationRules(payload),
      sceneSummary: coreDraft.summaryUpdate,
      sceneText: coreDraft.sceneText,
      outputRules: [
        'Return { "prompt": string, "choices": [{ "label": string, "isSpeech": boolean, "outcomeHint": string }] }.',
        'Return two or three choices.',
        'Do not include ids or kind.',
        'Choices must be short, concrete, and story-specific.',
        'Choices must continue the same episode and not start a new story.',
        'Keep prompt short (under 250 characters).',
        'Keep choices labels concise (under 100 characters).',
        'If providing outcomeHint, keep it short (under 200 characters).',
        ...buildParticipationRules(payload),
      ],
    },
    null,
    2,
  );
}

// buildMemoryPrompt sends bounded story state for compact memory only.
function buildMemoryPrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): string {
  return JSON.stringify(
    {
      task: 'update-episode-memory',
      seriesTitle: payload.seriesTitle,
      sceneText: coreDraft.sceneText,
      summaryUpdate: coreDraft.summaryUpdate,
      cliffhanger: coreDraft.cliffhanger,
      selectedStoryWordIds: payload.selectedStoryWords.map((word) => word.id),
      participationMode: payload.participationMode,
      participationRules: buildParticipationRules(payload),
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        lastEpisodeSummary: payload.lastEpisodeSummary,
      },
      outputRules: [
        'Return exactly these fields: currentConflict, knownFacts, openQuestions, importantObjectsOrLocations, lastEpisodeSummary, unresolvedCliffhanger, recurringStoryWordIds.',
        'lastEpisodeSummary must match summaryUpdate.',
        'unresolvedCliffhanger must match cliffhanger.',
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

// buildTranslationPrompt sends deterministic annotation targets for translation only.
function buildTranslationPrompt(
  payload: GenerateEpisodeRequest,
  sentences: readonly string[],
  targets: readonly AnnotationTarget[],
): string {
  return JSON.stringify(
    {
      task: 'translate-annotation-targets',
      cefr: payload.cefrLevel,
      sentences,
      targets,
      outputRules: [
        'Return { "translations": [...] }.',
        'Return at most one item per target.',
        'Each item must repeat wordId, sentenceIndex, and surfaceText exactly from a target.',
        'translation must be Russian Cyrillic.',
        'Good translations: "любопытный", "шепот". Bad translations: "curious", "showing interest", "lyubopytnyy", "Ð»ÑÐ±".',
      ],
    },
    null,
    2,
  );
}

// isStoryWordCandidate mirrors the mobile filter at the AI trust boundary.
function isStoryWordCandidate({
  level,
  maxLevel,
  partOfSpeech,
  word,
}: {
  // level is the candidate word difficulty.
  readonly level: GenerateEpisodeRequest['cefrLevel'];
  // maxLevel is the target series level.
  readonly maxLevel: GenerateEpisodeRequest['cefrLevel'];
  // partOfSpeech identifies function words that are poor story targets.
  readonly partOfSpeech: string;
  // word is the exact selected Oxford headword.
  readonly word: string;
}): boolean {
  const normalizedPartOfSpeech = partOfSpeech.toLocaleLowerCase();

  if (word.length <= 1 || /[\/()]/.test(word)) {
    return false;
  }

  if (getCefrRank(level) > getCefrRank(maxLevel)) {
    return false;
  }

  return ![
    'article',
    'auxiliary',
    'conjunction',
    'determiner',
    'modal',
    'number',
    'preposition',
    'pronoun',
  ].some((blockedPart) => normalizedPartOfSpeech.includes(blockedPart));
}

// getCefrRank turns CEFR labels into sortable difficulty ranks.
function getCefrRank(level: GenerateEpisodeRequest['cefrLevel']): number {
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(level);
}
