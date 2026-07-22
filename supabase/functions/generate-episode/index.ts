import { z } from 'npm:zod@4.4.3';

import {
  type EpisodePayload,
  episodePayloadSchema,
  type GenerateEpisodeRequest,
  generateEpisodeRequestSchema,
} from '../_shared/episodeContracts.ts';
import { finalizeEpisodePayload } from '../_shared/episodeFinalizers.ts';
import {
  type DialogueFrameDraft,
  looksLikeNarrationInDialogue,
} from '../_shared/dialogueFramePolicy.ts';
import {
  createEnglishGeneratedTextSchema,
  createRussianTranslationSchema,
} from '../_shared/generatedLanguage.ts';
import {
  corsHeaders,
  generationStateResponse,
  jsonResponse,
  logSafeError,
  moderationResponse,
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
import {
  type AiModelRole,
  generateStructuredObject,
  getAiModelId,
  isAiGatewayConfigured,
} from '../_shared/aiGateway.ts';
import {
  generateQualityAcceptedCandidate,
  type QualityReview,
  reviewGeneratedCandidate,
} from '../_shared/aiQuality.ts';
import { resolveOptionalAiEnrichment } from '../_shared/optionalAiEnrichment.ts';
import {
  omitStoryWordExamplesFromModeration,
  STORY_WORD_USAGE_RULES,
} from '../_shared/storyWordPolicy.ts';

// writerModel is logged without exposing prompts or server secrets.
const writerModel: string = getAiModelId('writer');

// PIPELINE_ATTEMPTS avoids repeating the full multi-model pipeline inside one Edge request.
const PIPELINE_ATTEMPTS = 1;

// FINAL_CLIFFHANGER_LIMIT matches the response contract sent to mobile clients.
const FINAL_CLIFFHANGER_LIMIT = 300;

// optionalDraftTextSchema accepts common model nulls for absent optional text.
const optionalDraftTextSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).optional(),
);

// coreEpisodeDraftSchema is the small AI contract for the creative opening scene.
const coreEpisodeDraftSchema = z.object({
  title: optionalDraftTextSchema.pipe(
    createEnglishGeneratedTextSchema(80).optional(),
  ),
  previouslyRecap: optionalDraftTextSchema.pipe(
    createEnglishGeneratedTextSchema(400).optional(),
  ),
  sceneText: createEnglishGeneratedTextSchema(1800),
  cliffhanger: createEnglishGeneratedTextSchema(1000),
  summaryUpdate: createEnglishGeneratedTextSchema(600),
});

// SentenceFrameDraftItem is one narration or spoken reader block before finalization.
type SentenceFrameDraftItem =
  | {
    // kind marks non-spoken story prose.
    readonly kind: 'narration';
    // text preserves one semantic narration block.
    readonly text: string;
  }
  | DialogueFrameDraft;

// sentenceFrameDraftItemSchema downgrades narration mislabeled as speech without failing generation.
const sentenceFrameDraftItemSchema: z.ZodType<SentenceFrameDraftItem> = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('narration'),
      text: createEnglishGeneratedTextSchema(600),
    }),
    z.object({
      kind: z.literal('dialogue'),
      speaker: z.string().trim().min(1).max(80),
      text: createEnglishGeneratedTextSchema(600),
    }),
  ])
  .transform((frame: SentenceFrameDraftItem): SentenceFrameDraftItem =>
    frame.kind === 'dialogue' &&
      looksLikeNarrationInDialogue(frame.text, frame.speaker)
      ? { kind: 'narration', text: frame.text }
      : frame
  );

// sentenceFrameDraftSchema is the small AI contract for reader dialogue metadata.
const sentenceFrameDraftSchema = z.object({
  frames: z
    .array(sentenceFrameDraftItemSchema)
    .min(3)
    .max(16),
});

// interactionDraftSchema is the small AI contract for the first learner decision.
const interactionDraftSchema = z.object({
  prompt: createEnglishGeneratedTextSchema(300),
  choices: z
    .array(
      z.object({
        label: createEnglishGeneratedTextSchema(120),
        isSpeech: z.boolean().optional(),
        outcomeHint: optionalDraftTextSchema.pipe(
          createEnglishGeneratedTextSchema(240).optional(),
        ),
      }),
    )
    .min(2)
    .max(3),
});

// memoryDraftSchema is the small AI contract for compact series memory updates.
const memoryDraftSchema = z.object({
  currentConflict: optionalDraftTextSchema.pipe(
    createEnglishGeneratedTextSchema(300).optional(),
  ),
  knownFacts: z.array(createEnglishGeneratedTextSchema(300)).max(32),
  openQuestions: z.array(createEnglishGeneratedTextSchema(300)).max(32),
  importantObjectsOrLocations: z.array(createEnglishGeneratedTextSchema(200))
    .max(32),
  lastEpisodeSummary: createEnglishGeneratedTextSchema(600),
  unresolvedCliffhanger: createEnglishGeneratedTextSchema(1000),
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
        translation: createRussianTranslationSchema(240),
        transcription: optionalDraftTextSchema.pipe(
          z.string().max(100).optional(),
        ),
      }),
    )
    .max(24),
});

// episodeCreativeCandidateSchema is the complete contract reviewed before enrichment.
const episodeCreativeCandidateSchema = z.object({
  coreDraft: coreEpisodeDraftSchema,
  interactionDraft: interactionDraftSchema,
});

// CoreEpisodeDraft is the parsed result of the creative opening step.
type CoreEpisodeDraft = z.infer<typeof coreEpisodeDraftSchema>;

// SentenceFrameDraft is the parsed result of the reader-frame step.
type SentenceFrameDraft = z.infer<typeof sentenceFrameDraftSchema>;

// InteractionDraft is the parsed result of the first-decision step.
type InteractionDraft = z.infer<typeof interactionDraftSchema>;

// MemoryDraft is the parsed result of the compact-memory step.
type MemoryDraft = z.infer<typeof memoryDraftSchema>;

// TranslationDraft is the parsed result of the annotation-translation step.
type TranslationDraft = z.infer<typeof translationDraftSchema>;

// EpisodeCreativeCandidate is the complete opening and first-decision contract.
type EpisodeCreativeCandidate = z.infer<typeof episodeCreativeCandidateSchema>;

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

  if (!isAiGatewayConfigured()) {
    return safeErrorResponse('unavailable', 503);
  }

  const requestBody = await readJsonBody(request);
  const parsedRequest = generateEpisodeRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    logSafeError(
      'generate-episode request validation failed',
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
        'This account is currently blocked from generating new episodes.',
      );
    }

    const payload = normalizeGenerationRequest(parsedRequest.data);
    // Oxford examples guide word sense but are not learner-authored strike evidence.
    const moderationEntries = collectModerationEntries({
      ...payload,
      selectedStoryWords: omitStoryWordExamplesFromModeration(
        payload.selectedStoryWords,
      ),
    });
    const moderationSignals = scanModerationEntries(moderationEntries);

    if (moderationSignals.length > 0) {
      const currentState = await moderationStore.getState(
        authResult.user.userId,
      );
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
          : `This request matched blocked content rules. ${review.warningsRemaining} warning${
            review.warningsRemaining === 1 ? '' : 's'
          } remain before a ban.`,
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
      operation: 'generate-episode',
    });

    return safeErrorResponse('unavailable', 502);
  }
});

// generateValidatedEpisode builds the final app payload from smaller AI drafts.
async function generateValidatedEpisode(
  payload: GenerateEpisodeRequest,
): Promise<ReturnType<typeof finalizeEpisodePayload>> {
  let finalizationError: Error | undefined;

  for (let attempt = 1; attempt <= PIPELINE_ATTEMPTS; attempt += 1) {
    try {
      const creativeCandidate = await generateEpisodeCreativeCandidate(
        payload,
        finalizationError ? [finalizationError.message] : [],
      );
      const { coreDraft, interactionDraft } = creativeCandidate;
      // frameDraftPromise and memoryDraftPromise keep independent enrichment work concurrent.
      const frameDraftPromise: Promise<SentenceFrameDraft> =
        generateReaderFrameDraft(payload, coreDraft);
      const memoryDraftPromise: Promise<MemoryDraft> = generateMemoryDraft(
        payload,
        coreDraft,
      );
      const frameDraft = await frameDraftPromise;
      const sentences = extractFrameSentences(frameDraft);
      const annotationTargets = findAnnotationTargets({
        request: payload,
        sentences,
      });
      // translationDraftPromise starts only after stable semantic frame indices exist.
      const translationDraftPromise: Promise<TranslationDraft> =
        annotationTargets.length === 0
          ? Promise.resolve({ translations: [] })
          : resolveOptionalAiEnrichment({
            stage: 'episode_story_word_translations',
            generate: (): Promise<TranslationDraft> =>
              generateEpisodeTranslationDraft(
                payload,
                sentences,
                annotationTargets,
              ),
            fallback: { translations: [] },
          });
      const [memoryDraft, translationDraft] = await Promise.all([
        memoryDraftPromise,
        translationDraftPromise,
      ]);
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

      const finalizedPayload = finalizeEpisodePayload({
        payload: assembledPayload,
        request: payload,
      });

      return finalizedPayload;
    } catch (error) {
      finalizationError = error instanceof Error
        ? error
        : new Error(String(error));

      logSafeError('generate-episode pipeline failed', finalizationError, {
        attempt: String(attempt),
        operation: 'generate-episode',
      });
    }
  }

  throw finalizationError ?? new Error('Episode finalization failed.');
}

// generateEpisodeCreativeCandidate quality-gates the writer before utility enrichment.
async function generateEpisodeCreativeCandidate(
  payload: GenerateEpisodeRequest,
  initialRetryHints: readonly string[],
): Promise<EpisodeCreativeCandidate> {
  return await generateQualityAcceptedCandidate({
    label: 'episode-opening',
    generate: async (role, retryHints) => {
      const combinedRetryHints = [...initialRetryHints, ...retryHints];

      if (role === 'fallback') {
        return await generateEpisodeFallbackCandidate(
          payload,
          combinedRetryHints,
        );
      }

      const coreDraft = await generateEpisodeCoreDraft(
        payload,
        combinedRetryHints,
      );
      const interactionDraft = await generateEpisodeInteractionDraft(
        payload,
        coreDraft,
        combinedRetryHints,
      );

      return { coreDraft, interactionDraft };
    },
    repair: (candidate, issues) =>
      repairEpisodeCreativeCandidate(payload, candidate, issues),
    review: (candidate) =>
      reviewGeneratedCandidate({
        workflow: 'episode-opening',
        criteria: [
          'All learner-facing story prose, titles, recaps, summaries, prompts, and choice labels must be written in English. Russian is allowed only inside annotation translation fields, which are generated later.',
          `English grammar and vocabulary must be broadly suitable for CEFR ${payload.cefrLevel}; reject only a sustained mismatch, not isolated contextual words or names.`,
          'Use language_error only for a concrete grammar error, malformed sentence, incorrect collocation, or clearly unnatural English construction, not for subjective style preferences.',
          'When compact memory or a previous episode summary contains facts, the scene must not contradict them; empty prior context creates no continuity requirement.',
          'When a previous summary or unresolved cliffhanger exists, the scene must advance it instead of repeating or lightly paraphrasing it.',
          'Every used Story Word must match its supplied partOfSpeech and the dictionary sense demonstrated by usageExamples; the exact headword must be integrated into natural grammar rather than used as another part of speech.',
          'Selected Story Words must be used naturally and only some should be introduced in the opening when the set is large.',
          'The scene, cliffhanger, prompt, and choices must describe one aligned scenario.',
          'The interaction prompt must be a concise decision cue and must not repeat, quote, or paraphrase the final scene sentences.',
          'Choices must be meaningfully different, story-specific, and must not be knowledge quizzes.',
          `Participation behavior must remain ${payload.participationMode} mode.`,
          'The story must be original and must satisfy the supplied safety and copyright constraints.',
        ],
        context: {
          seriesTitle: payload.seriesTitle,
          cefrLevel: payload.cefrLevel,
          genre: payload.genre,
          tone: payload.tone,
          premise: payload.premise,
          participationMode: payload.participationMode,
          mainCharacters: payload.mainCharacters,
          characterProfiles: payload.characterProfiles,
          userRole: payload.userRole,
          selectedStoryWords: payload.selectedStoryWords,
          compactSeriesMemory: payload.compactSeriesMemory,
          lastEpisodeSummary: payload.lastEpisodeSummary,
          safetyAndCopyrightConstraints: payload.safetyAndCopyrightConstraints,
        },
        candidate,
      }),
  });
}

// generateEpisodeCoreDraft writes the story before any decision text can bias it.
async function generateEpisodeCoreDraft(
  payload: GenerateEpisodeRequest,
  retryHints: readonly string[],
): Promise<CoreEpisodeDraft> {
  return await generateJsonWithSchema({
    prompt: appendRetryHints(buildEpisodeCorePrompt(payload), retryHints),
    role: 'writer',
    schema: coreEpisodeDraftSchema,
    taskName: 'episode_opening_story',
    system: buildEpisodeCoreSystemPrompt(),
    temperature: 0.85,
    frequencyPenalty: 0.25,
    maxOutputTokens: 1650,
  });
}

// generateEpisodeInteractionDraft creates choices only from the frozen accepted story draft.
async function generateEpisodeInteractionDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
  retryHints: readonly string[],
): Promise<InteractionDraft> {
  return await generateJsonWithSchema({
    prompt: appendRetryHints(
      buildEpisodeInteractionPrompt(payload, coreDraft),
      retryHints,
    ),
    role: 'decision',
    schema: interactionDraftSchema,
    taskName: 'episode_opening_decision',
    system: buildEpisodeInteractionSystemPrompt(),
    temperature: 0.7,
    maxOutputTokens: 1200,
    maxAttempts: 2,
  });
}

// generateEpisodeFallbackCandidate replaces a structurally failed writer pipeline once.
async function generateEpisodeFallbackCandidate(
  payload: GenerateEpisodeRequest,
  retryHints: readonly string[],
): Promise<EpisodeCreativeCandidate> {
  return await generateJsonWithSchema({
    prompt: appendRetryHints(buildEpisodeFallbackPrompt(payload), retryHints),
    role: 'fallback',
    schema: episodeCreativeCandidateSchema,
    taskName: 'episode_opening_fallback',
    system: buildEpisodeFallbackSystemPrompt(),
    temperature: 0.7,
    maxOutputTokens: 2700,
  });
}

// repairEpisodeCreativeCandidate fixes only reviewer-proven defects in a complete draft.
async function repairEpisodeCreativeCandidate(
  payload: GenerateEpisodeRequest,
  candidate: EpisodeCreativeCandidate,
  issues: QualityReview['issues'],
): Promise<EpisodeCreativeCandidate> {
  return await generateJsonWithSchema({
    prompt: buildEpisodeRepairPrompt(payload, candidate, issues),
    role: 'fallback',
    schema: episodeCreativeCandidateSchema,
    taskName: 'episode_opening_repair',
    system: buildEpisodeRepairSystemPrompt(),
    temperature: 0.3,
    maxOutputTokens: 2700,
  });
}

// generateReaderFrameDraft creates English semantic reader blocks only.
async function generateReaderFrameDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): Promise<SentenceFrameDraft> {
  return await generateJsonWithSchema({
    prompt: buildReaderFramePrompt(payload, coreDraft),
    role: 'utility',
    schema: sentenceFrameDraftSchema,
    taskName: 'episode_reader_frames',
    system: buildReaderFrameSystemPrompt(),
    temperature: 0.1,
    maxOutputTokens: 2200,
    maxAttempts: 2,
  });
}

// generateEpisodeTranslationDraft translates only verified Story Word occurrences.
async function generateEpisodeTranslationDraft(
  payload: GenerateEpisodeRequest,
  sentences: readonly string[],
  annotationTargets: readonly AnnotationTarget[],
): Promise<TranslationDraft> {
  return await generateJsonWithSchema({
    prompt: buildEpisodeTranslationPrompt(
      payload,
      sentences,
      annotationTargets,
    ),
    role: 'utility',
    schema: translationDraftSchema,
    taskName: 'episode_story_word_translations',
    system: buildTranslationSystemPrompt(),
    temperature: 0.1,
    maxOutputTokens: 1400,
    maxAttempts: 2,
  });
}

// generateMemoryDraft asks the model only for compact continuity memory.
async function generateMemoryDraft(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): Promise<MemoryDraft> {
  return await generateJsonWithSchema({
    prompt: buildMemoryPrompt(payload, coreDraft),
    role: 'validator',
    schema: memoryDraftSchema,
    taskName: 'episode_memory',
    system: buildMemorySystemPrompt(),
    temperature: 0.1,
    maxOutputTokens: 1500,
    maxAttempts: 2,
  });
}

// GenerateJsonInput describes one small structured AI call.
type GenerateJsonInput<TSchema extends z.ZodType> = {
  // prompt is the step-specific JSON instruction.
  readonly prompt: string;
  // role selects the model assigned to this bounded task.
  readonly role: AiModelRole;
  // schema validates the small model response before assembly.
  readonly schema: TSchema;
  // taskName is a stable structured-output contract name.
  readonly taskName: string;
  // system is the step-specific behavior boundary.
  readonly system: string;
  // temperature controls creativity for this task.
  readonly temperature: number;
  // maxOutputTokens bounds response cost and size.
  readonly maxOutputTokens: number;
  // frequencyPenalty reduces repeated prose in creative tasks.
  readonly frequencyPenalty?: number;
  // maxAttempts permits one bounded structural retry for small enrichment contracts.
  readonly maxAttempts?: number;
};

// generateJsonWithSchema delegates structured generation to the shared AI gateway.
async function generateJsonWithSchema<TSchema extends z.ZodType>({
  prompt,
  role,
  schema,
  taskName,
  system,
  temperature,
  maxOutputTokens,
  frequencyPenalty,
  maxAttempts,
}: GenerateJsonInput<TSchema>): Promise<z.infer<TSchema>> {
  return await generateStructuredObject({
    role,
    schema,
    schemaName: taskName,
    schemaDescription: `Validated structured output for ${taskName}.`,
    system,
    prompt,
    temperature,
    maxOutputTokens,
    frequencyPenalty,
    maxAttempts,
  });
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
  const cutIndex = sentenceBoundary >= Math.floor(maxLength * 0.6)
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

// extractFrameSentences maps semantic reader blocks into the legacy sentences field.
function extractFrameSentences(frameDraft: SentenceFrameDraft): string[] {
  return frameDraft.frames.map((frame) => frame.text);
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
    'Regenerate the complete object; do not mention these corrections in story text.',
  ].join('\n');
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
        : []
    )
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
      model: writerModel,
    });

    return undefined;
  }
}

// buildEpisodeCoreSystemPrompt keeps the story step independent from decision generation.
function buildEpisodeCoreSystemPrompt(): string {
  return [
    'You write an original opening scene for an interactive English-learning episode.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return only title, optional previouslyRecap, sceneText, cliffhanger, and summaryUpdate.',
    'Write every returned field in English. Do not use Russian or Cyrillic prose.',
    'Do not generate choices, prompts, sentence frames, annotations, translations, or memory arrays.',
    'Write original stories only. Do not copy protected worlds, names, characters, or plots.',
    'Respect the requested CEFR level and participation mode strictly.',
    'Use only some selected Story Words naturally when the set is large.',
    ...STORY_WORD_USAGE_RULES,
    'Advance supplied continuity instead of repeating or paraphrasing it.',
    'Keep the scene concise enough for mobile reading but substantial enough to set up a meaningful decision.',
    'Use plain text only with ASCII punctuation and no Markdown.',
    'Summaries must describe only story events, never schema or app mechanics.',
  ].join('\n');
}

// buildEpisodeInteractionSystemPrompt binds the first decision to frozen story facts.
function buildEpisodeInteractionSystemPrompt(): string {
  return [
    'You write only the first learner decision for an already-written interactive story scene.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Treat the supplied story draft as immutable truth. Do not rewrite, extend, or reinterpret it.',
    'Write the prompt, choice labels, and outcome hints in English only.',
    'The prompt and every choice must be immediately possible in the supplied scene and cliffhanger.',
    'The prompt is a decision cue, not narration: never copy, quote, summarize, or restate the ending of the supplied scene.',
    'Ask one concrete question; if the decision is already obvious from the choices, use a very short cue such as What now?',
    'Choices must be short, concrete, meaningfully different story decisions, never quizzes.',
    'Respect the supplied participation mode and use plain text with ASCII punctuation.',
  ].join('\n');
}

// buildEpisodeFallbackSystemPrompt creates one complete candidate after structural failure.
function buildEpisodeFallbackSystemPrompt(): string {
  return [
    'You write an original opening scene and its first learner choice for an interactive English-learning episode.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return coreDraft and interactionDraft together so the scene, cliffhanger, prompt, and choices describe one scenario.',
    'Write every story, summary, prompt, and choice field in English only.',
    'Do not generate sentence frames, annotations, translations, or memory arrays.',
    'Write original stories only. Do not copy protected worlds, names, characters, or plots.',
    'Respect the requested CEFR level strictly.',
    'Use only some selected Story Words naturally in the opening when the set is large.',
    ...STORY_WORD_USAGE_RULES,
    'Keep the scene concise enough for mobile reading but substantial enough to set up a meaningful first decision.',
    'The decision prompt must not repeat or paraphrase the final story sentences.',
    'Choices are story decisions, never vocabulary or comprehension quizzes.',
    'Use plain text only: no Markdown, no bullet lists, no italics markers, no typographic quotes.',
    'Use ASCII punctuation in English text: apostrophe, quotation mark, three dots, and hyphen.',
    'Summaries must describe only story events, never mention schema, interaction points, prompts, or app mechanics.',
  ].join('\n');
}

// buildEpisodeRepairSystemPrompt constrains the stronger model to evidence-based edits.
function buildEpisodeRepairSystemPrompt(): string {
  return [
    'You are a precise editor for an interactive English-learning episode.',
    'Return exactly one complete raw JSON object. Do not wrap it in Markdown fences.',
    'Fix every supplied reviewer issue using its code, evidence, and instruction.',
    'Keep every learner-facing field in English; Russian is never allowed in story content.',
    'Preserve fields and wording that are not implicated by an issue.',
    'For choice_mismatch or choice_similarity, edit interactionDraft only unless the evidence proves the cliffhanger itself is defective.',
    'For continuity, repetition, language, Story Word, or CEFR issues, make the smallest necessary edits and keep the same story event.',
    'When repairing a Story Word, preserve its exact supplied partOfSpeech and usageExample sense.',
    'Do not introduce new characters, objects, locations, facts, or plot branches unless an issue explicitly requires it.',
    'Keep the scene, cliffhanger, prompt, and choices mutually consistent.',
    'A repaired decision prompt must contain only a concise question or short choice cue, never repeated story prose.',
    'Use plain text only with ASCII punctuation and no Markdown.',
  ].join('\n');
}

// buildReaderFrameSystemPrompt keeps Russian translation outside the framing call.
function buildReaderFrameSystemPrompt(): string {
  return [
    'You divide already-written English episode text into semantic reader frames.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return frames only.',
    'Preserve every meaningful part of the original scene and its event order.',
    'Every frame text must remain in English and must copy the supplied English wording without translation or paraphrase.',
    'Do not add new story events, choices, feedback, explanations, or prose.',
    'Dialogue frame text contains only spoken words, without quotation marks or attribution.',
    'When narration contains a speaker attribution followed by quoted words, split the attribution into narration and put the complete quoted words in a separate dialogue frame for that speaker.',
    'Never create a dialogue frame whose wording already appears at the end of the preceding narration frame as reported speech.',
    'Never classify text beginning with a character name plus says, said, asks, replies, or an action as dialogue.',
    'Example: Vlad says, leaning against the desk belongs in narration, not in Vlad dialogue.',
    'Narration frames contain actions, descriptions, attribution, thoughts, and other non-spoken text.',
    'Use an exact pinned character name for every known dialogue speaker.',
    'Use plain ASCII punctuation and no Markdown.',
  ].join('\n');
}

// buildTranslationSystemPrompt isolates Russian output to annotation translations.
function buildTranslationSystemPrompt(): string {
  return [
    'You translate verified English Story Word occurrences into concise contextual Russian.',
    'Return exactly one raw JSON object. Do not wrap it in Markdown fences.',
    'Return translations only and return exactly one item for every supplied target.',
    'Only the translation field may contain Russian Cyrillic.',
    'Copy wordId, sentenceIndex, and surfaceText exactly from each target.',
    'Do not rewrite story text, add frames, explain grammar, or add commentary.',
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

// buildEpisodeCorePrompt sends bounded context for story generation only.
function buildEpisodeCorePrompt(
  payload: GenerateEpisodeRequest,
): string {
  return JSON.stringify(
    {
      task: 'generate-episode-opening-story',
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
        'Return { "title"?: string, "previouslyRecap"?: string, "sceneText": string, "cliffhanger": string, "summaryUpdate": string }.',
        'If providing previouslyRecap, keep it very short (under 300 characters).',
        'Keep the title short (under 60 characters).',
        'The title field names only this specific episode and must express its central event, discovery, conflict, or decision.',
        'Treat seriesTitle as story context only. Never copy, repeat, paraphrase, prefix, or suffix seriesTitle inside the episode title.',
        'Never combine seriesTitle and the episode title with a colon, dash, slash, pipe, parentheses, or any other separator.',
        'The episode title must stand on its own without a series label or episode number.',
        'sceneText must be one coherent opening scene or short passage.',
        'Do not return sentences, sentenceFrames, annotations, translations, or memoryUpdate.',
        'Use 2-4 selected Story Words in the initial scene, or fewer when the selected set is smaller.',
        'Do not force all selected Story Words into the initial scene; unused words can appear in later submit-interaction continuations.',
        'When using a selected Story Word, obey its partOfSpeech and usageExamples, then build a grammatical sentence around the exact headword.',
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

// buildEpisodeInteractionPrompt freezes the story before generating the first choice.
function buildEpisodeInteractionPrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): string {
  return JSON.stringify(
    {
      task: 'generate-first-decision-for-frozen-opening',
      cefr: payload.cefrLevel,
      participationMode: payload.participationMode,
      participationRules: buildParticipationRules(payload),
      frozenStory: coreDraft,
      outputRules: [
        'Return { "prompt": string, "choices": [{ "label": string, "isSpeech"?: boolean, "outcomeHint"?: string }] }.',
        'The interaction prompt must directly follow the frozen scene and cliffhanger.',
        'The prompt must not copy, quote, summarize, paraphrase, or restate any sentence from frozenStory.',
        'Use one concise concrete question. If the choices make the decision obvious, a short cue such as What now? is enough.',
        'Every choice must be possible using only people, objects, facts, and actions established in frozenStory.',
        'Return two or three short, concrete, story-specific choices with meaningfully different actions or intentions.',
        'Do not create choices that differ only by wording, tone, or synonyms.',
        'Set isSpeech false only for a physical action or internal decision; omit it or use true for spoken choices.',
        'Keep prompt under 250 characters, labels under 100 characters, and optional outcomeHint under 200 characters.',
        'Do not alter, continue, summarize, or quote the frozen story.',
        'Do not use asterisks, Markdown, curly quotes, curly apostrophes, or ellipsis characters.',
      ],
    },
    null,
    2,
  );
}

// buildEpisodeFallbackPrompt sends the full contract only after structural writer failure.
function buildEpisodeFallbackPrompt(
  payload: GenerateEpisodeRequest,
): string {
  return JSON.stringify(
    {
      task: 'generate-complete-episode-opening-fallback',
      requirements: {
        seriesTitle: payload.seriesTitle,
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
        'Return { "coreDraft": { "title"?: string, "previouslyRecap"?: string, "sceneText": string, "cliffhanger": string, "summaryUpdate": string }, "interactionDraft": { "prompt": string, "choices": [{ "label": string, "isSpeech"?: boolean, "outcomeHint"?: string }] } }.',
        'Write one coherent scene that advances prior context, uses suitable CEFR language, and ends in a concrete decision.',
        'Do not repeat or paraphrase the prior summary or unresolved cliffhanger.',
        'Use 2-4 selected Story Words naturally, or fewer when the selected set is smaller.',
        'The prompt and every choice must be possible from the scene and cliffhanger.',
        'Return two or three meaningfully different story decisions, never quizzes.',
        'Keep the title under 60 characters, recap under 300, summary under 500, prompt under 250, and labels under 100.',
        'Never copy or decorate seriesTitle as the episode title.',
        'Do not return frames, annotations, translations, memory, Markdown, or meta commentary.',
        ...buildParticipationRules(payload),
      ],
    },
    null,
    2,
  );
}

// buildEpisodeRepairPrompt forwards the exact candidate and concrete review evidence.
function buildEpisodeRepairPrompt(
  payload: GenerateEpisodeRequest,
  candidate: EpisodeCreativeCandidate,
  issues: QualityReview['issues'],
): string {
  return JSON.stringify(
    {
      task: 'repair-reviewed-episode-opening',
      protectedRequirements: {
        seriesTitle: payload.seriesTitle,
        cefr: payload.cefrLevel,
        genre: payload.genre,
        tone: payload.tone,
        premise: payload.premise,
        participationMode: payload.participationMode,
        participationRules: buildParticipationRules(payload),
        mainCharacters: payload.mainCharacters,
        characterProfiles: payload.characterProfiles,
        userRole: payload.userRole,
        selectedStoryWords: payload.selectedStoryWords,
        safetyAndCopyrightConstraints: payload.safetyAndCopyrightConstraints,
      },
      boundedContext: {
        compactSeriesMemory: payload.compactSeriesMemory,
        lastEpisodeSummary: payload.lastEpisodeSummary,
      },
      candidate,
      reviewerIssues: issues,
      outputRules: [
        'Return the complete candidate with coreDraft and interactionDraft.',
        'Resolve every reviewer issue and make the smallest possible edit.',
        'Preserve all unaffected fields, story events, names, facts, and wording.',
        'Do not add explanations, change logs, Markdown, or fields outside the schema.',
      ],
    },
    null,
    2,
  );
}

// buildReaderFramePrompt asks for semantic blocks without mixing output languages.
function buildReaderFramePrompt(
  payload: GenerateEpisodeRequest,
  coreDraft: CoreEpisodeDraft,
): string {
  return JSON.stringify(
    {
      task: 'build-english-reader-frames',
      cefr: payload.cefrLevel,
      characterProfiles: payload.characterProfiles,
      sceneText: coreDraft.sceneText,
      outputRules: [
        'Return { "frames": [...] }.',
        'Return 3-16 semantic reader blocks in the same order as sceneText.',
        'Each frame must include kind and text.',
        'Dialogue frames must also include speaker.',
        'For pinned characters, speaker must exactly match characterProfiles[].name. Do not include titles, roles, or descriptions in speaker.',
        'Dialogue frame text must contain only words actually spoken aloud, without quotation marks or attribution.',
        'If one source passage contains narration such as Vlad says followed by quoted speech, return the attribution as narration and the entire quoted speech as a separate Vlad dialogue frame.',
        'Do not repeat the end of a narration frame as a separate dialogue frame, including wording already presented as reported speech.',
        'Never put a character name, speech tag, body movement, facial expression, or stage direction inside dialogue text.',
        'Wrong dialogue: speaker Vlad, text Vlad says, leaning against the desk.',
        'Correct: make Vlad says, leaning against the desk a narration frame; place only separately quoted words in a Vlad dialogue frame.',
        'Narration frame text must be natural reader text, not labels or summaries.',
        'Do not create one frame per grammatical sentence. Group adjacent narration sentences into one frame when they form the same meaningful paragraph, action beat, description, or idea.',
        'A narration frame may contain several related sentences. Start a new narration frame only when the meaning, focus, time, location, or action beat changes.',
        'Keep actual dialogue turns separate from narration even when speech is embedded inside a prose paragraph.',
        'Separate embedded speech from attribution: Mira whispered open it should become narration Mira whispered. and dialogue Open it.',
        'If consecutive lines are spoken by the same speaker, keep them as adjacent dialogue frames; the server will merge them for playback.',
        'Do not omit any meaningful story information from sceneText.',
        'Do not invent information that is not present in sceneText.',
        'Keep all frame text in English. Never translate any part of sceneText.',
      ],
    },
    null,
    2,
  );
}

// buildEpisodeTranslationPrompt sends only deterministic targets after framing succeeds.
function buildEpisodeTranslationPrompt(
  payload: GenerateEpisodeRequest,
  sentences: readonly string[],
  annotationTargets: readonly AnnotationTarget[],
): string {
  return JSON.stringify(
    {
      task: 'translate-verified-story-word-targets',
      cefr: payload.cefrLevel,
      targets: annotationTargets.map((target) => ({
        ...target,
        context: sentences[target.sentenceIndex],
      })),
      outputRules: [
        'Return { "translations": [{ "wordId": string, "sentenceIndex": number, "surfaceText": string, "translation": string, "transcription"?: string }] }.',
        'Return exactly one translation item for every supplied target and no extra items.',
        'Copy wordId, sentenceIndex, and surfaceText exactly from the target.',
        'translation must be concise contextual Russian Cyrillic. transcription is optional.',
        'Do not return story frames, English rewrites, explanations, or Markdown.',
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
