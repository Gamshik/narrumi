import { z } from 'zod';

import {
  cefrLevels,
  interactionKinds,
  learningGenres,
  type CefrLevel,
  type Episode,
  type EpisodeSentenceFrame,
  type EpisodeInteractionKind,
  type LearningGenre,
  type SeriesMemory,
  type VocabularyItem,
} from '@domain/index';

// SAFETY_AND_COPYRIGHT_CONSTRAINTS is sent to Edge Functions with every story request.
export const SAFETY_AND_COPYRIGHT_CONSTRAINTS: readonly string[] = [
  'Generate only safe, age-appropriate learning content.',
  'Do not copy protected worlds, characters, names, or plots.',
  'If the premise resembles a protected franchise, create an original story with a similar broad mood or genre.',
  'Keep the episode within the requested CEFR level and avoid advanced grammar above that level.',
  'Use selected Story Words naturally instead of listing or drilling them.',
] as const;

// AiStoryWord is the bounded vocabulary context sent to the Edge Function.
export type AiStoryWord = Pick<
  VocabularyItem,
  'id' | 'word' | 'partOfSpeech' | 'level'
>;

// CompactSeriesMemoryPayload is the only series continuity shape sent to AI.
export type CompactSeriesMemoryPayload = Pick<
  SeriesMemory,
  | 'premise'
  | 'genre'
  | 'tone'
  | 'mainCharacters'
  | 'userRole'
  | 'currentConflict'
  | 'knownFacts'
  | 'openQuestions'
  | 'importantObjectsOrLocations'
  | 'lastEpisodeSummary'
  | 'unresolvedCliffhanger'
  | 'recurringStoryWordIds'
>;

// GenerateEpisodeRequest is the application contract for the generate-episode Edge Function.
export type GenerateEpisodeRequest = {
  // seriesId keeps the response scoped to the local continuity root.
  readonly seriesId: string;
  // orderIndex tells the model which episode number is being generated.
  readonly orderIndex: number;
  // cefrLevel controls grammar and vocabulary difficulty.
  readonly cefrLevel: CefrLevel;
  // genre is the broad original story category.
  readonly genre: LearningGenre;
  // tone controls the story mood without expanding product scope.
  readonly tone: string;
  // premise is the bounded series setup.
  readonly premise: string;
  // mainCharacters names recurring characters without full history.
  readonly mainCharacters: readonly string[];
  // userRole records the learner role when present.
  readonly userRole?: string;
  // selectedStoryWords are the selected local Oxford words for this episode.
  readonly selectedStoryWords: readonly AiStoryWord[];
  // compactSeriesMemory prevents unbounded history from crossing the AI boundary.
  readonly compactSeriesMemory: CompactSeriesMemoryPayload;
  // lastEpisodeSummary repeats the most recent summary as a high-signal context field.
  readonly lastEpisodeSummary?: string;
  // safetyAndCopyrightConstraints are explicit server-enforced generation rules.
  readonly safetyAndCopyrightConstraints: readonly string[];
};

// EpisodeAiPayload is the validated structured JSON returned from generate-episode.
export type EpisodeAiPayload = {
  // previouslyRecap optionally gives continuity context to the learner.
  readonly previouslyRecap?: string;
  // title is the short episode label shown in history.
  readonly title?: string;
  // sceneText is the generated initial episode content.
  readonly sceneText: string;
  // sentences are the karaoke and TTS playback units.
  readonly sentences: readonly string[];
  // sentenceFrames explicitly mark each playback unit as narration or dialogue.
  readonly sentenceFrames: readonly EpisodeSentenceFrame[];
  // storyWordIds confirms which selected words were used.
  readonly storyWordIds: readonly string[];
  // annotations provide context-aware inline translation hints.
  readonly annotations: Episode['annotations'];
  // interaction is the first decision point in the multi-turn episode.
  readonly interaction: {
    // kind selects the supported learner interaction pattern.
    readonly kind: EpisodeInteractionKind;
    // prompt is shown before the learner answers.
    readonly prompt: string;
    // choices are present for controlled story-choice interactions.
    readonly choices: Episode['interactions'][number]['choices'];
  };
  // cliffhanger stores the narrative reason to continue later.
  readonly cliffhanger: string;
  // summaryUpdate is compact memory input for the next episode.
  readonly summaryUpdate: string;
  // memoryUpdate is a structured patch for compact SeriesMemory.
  readonly memoryUpdate: SeriesMemoryUpdatePayload;
};

// SubmitInteractionRequest is the application contract for submit-interaction.
export type SubmitInteractionRequest = {
  // episodeId identifies the saved local episode being answered.
  readonly episodeId: string;
  // interactionId identifies the current unanswered turn.
  readonly interactionId: string;
  // seriesId scopes the answer to one continuity root.
  readonly seriesId: string;
  // cefrLevel controls correction and continuation complexity.
  readonly cefrLevel: CefrLevel;
  // genre is passed for bounded story continuity.
  readonly genre: LearningGenre;
  // tone keeps the feedback story-friendly.
  readonly tone: string;
  // compactSeriesMemory is the bounded memory context, not full history.
  readonly compactSeriesMemory: CompactSeriesMemoryPayload;
  // episodeSummary is the current episode summary before applying the answer.
  readonly episodeSummary: string;
  // interactionPrompt is the exact prompt the learner answered.
  readonly interactionPrompt: string;
  // interactionCount is the current ordered turn count including this interaction.
  readonly interactionCount: number;
  // previousDecisions provide bounded episode progress without a full transcript.
  readonly previousDecisions: readonly EpisodeDecisionPayload[];
  // selectedStoryWords are the planned Episode Words for the whole episode arc.
  readonly selectedStoryWords: readonly AiStoryWord[];
  // encounteredStoryWordIds tells the AI which planned words already appeared.
  readonly encounteredStoryWordIds: readonly string[];
  // selectedChoiceId stores the selected controlled option when used.
  readonly selectedChoiceId?: string;
  // selectedChoiceLabel is the visible selected story option when used.
  readonly selectedChoiceLabel?: string;
  // userReply stores free-form learner text when used.
  readonly userReply?: string;
  // safetyAndCopyrightConstraints are explicit server-enforced continuation rules.
  readonly safetyAndCopyrightConstraints: readonly string[];
};

// EpisodeDecisionPayload is compact context for one completed interaction turn.
export type EpisodeDecisionPayload = {
  // prompt is the story decision the learner previously answered.
  readonly prompt: string;
  // answer is the selected choice or short learner reply.
  readonly answer: string;
  // feedback is optional concise language support already shown to the learner.
  readonly feedback?: string;
};

// InteractionAiPayload is the validated structured JSON returned after learner input.
export type InteractionAiPayload = {
  // feedback is concise correction or support for the learner answer.
  readonly feedback: string;
  // continuationText extends the same episode after the learner answer.
  readonly continuationText: string;
  // continuationSentences are appended to the same reader timeline.
  readonly continuationSentences: readonly string[];
  // continuationSentenceFrames explicitly mark appended units as narration or dialogue.
  readonly continuationSentenceFrames: readonly EpisodeSentenceFrame[];
  // continuationAnnotations provide translation hints for newly appended text.
  readonly continuationAnnotations: Episode['annotations'];
  // isEpisodeComplete tells whether the current episode arc has ended.
  readonly isEpisodeComplete: boolean;
  // nextInteraction is required while the same episode continues.
  readonly nextInteraction?: EpisodeAiPayload['interaction'];
  // cliffhanger is required when the current episode ends.
  readonly cliffhanger?: string;
  // summaryUpdate is the compact post-answer episode summary.
  readonly summaryUpdate: string;
  // memoryUpdate is a structured patch for compact SeriesMemory.
  readonly memoryUpdate: SeriesMemoryUpdatePayload;
};

// SeriesMemoryUpdatePayload is the only AI-written memory patch accepted by the client.
export type SeriesMemoryUpdatePayload = {
  // currentConflict replaces or refines the active story problem.
  readonly currentConflict?: string;
  // knownFacts are compact continuity facts after validation.
  readonly knownFacts: readonly string[];
  // openQuestions are unresolved story questions after validation.
  readonly openQuestions: readonly string[];
  // importantObjectsOrLocations are recurring anchors after validation.
  readonly importantObjectsOrLocations: readonly string[];
  // lastEpisodeSummary is the latest bounded summary for future context.
  readonly lastEpisodeSummary: string;
  // unresolvedCliffhanger is the active next-episode hook.
  readonly unresolvedCliffhanger: string;
  // recurringStoryWordIds are selected words that may resurface naturally.
  readonly recurringStoryWordIds: readonly string[];
};

// parseEpisodeAiPayload validates untrusted Edge Function output before storage.
export function parseEpisodeAiPayload(value: unknown): EpisodeAiPayload {
  const parsed = episodeAiPayloadSchema.parse(value);

  return {
    ...(parsed.previouslyRecap
      ? { previouslyRecap: parsed.previouslyRecap }
      : {}),
    ...(parsed.title ? { title: parsed.title } : {}),
    sceneText: parsed.sceneText,
    sentences: parsed.sentences,
    sentenceFrames: parsed.sentenceFrames,
    storyWordIds: parsed.storyWordIds,
    annotations: parsed.annotations.map((annotation) => ({
      ...(annotation.wordId ? { wordId: annotation.wordId } : {}),
      surfaceText: annotation.surfaceText,
      translation: annotation.translation,
      ...(annotation.transcription
        ? { transcription: annotation.transcription }
        : {}),
      sentenceIndex: annotation.sentenceIndex,
    })),
    interaction: {
      kind: parsed.interaction.kind,
      prompt: parsed.interaction.prompt,
      choices: parsed.interaction.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        ...(choice.outcomeHint ? { outcomeHint: choice.outcomeHint } : {}),
      })),
    },
    cliffhanger: parsed.cliffhanger,
    summaryUpdate: parsed.summaryUpdate,
    memoryUpdate: normalizeMemoryUpdate(parsed.memoryUpdate),
  };
}

// parseInteractionAiPayload validates untrusted interaction output before storage.
export function parseInteractionAiPayload(value: unknown): InteractionAiPayload {
  const parsed = interactionAiPayloadSchema.parse(value);

  return {
    feedback: parsed.feedback,
    continuationText: parsed.continuationText,
    continuationSentences: parsed.continuationSentences,
    continuationSentenceFrames: parsed.continuationSentenceFrames,
    continuationAnnotations: parsed.continuationAnnotations.map((annotation) => ({
      ...(annotation.wordId ? { wordId: annotation.wordId } : {}),
      surfaceText: annotation.surfaceText,
      translation: annotation.translation,
      ...(annotation.transcription
        ? { transcription: annotation.transcription }
        : {}),
      sentenceIndex: annotation.sentenceIndex,
    })),
    isEpisodeComplete: parsed.isEpisodeComplete,
    ...(parsed.nextInteraction
      ? {
          nextInteraction: {
            kind: parsed.nextInteraction.kind,
            prompt: parsed.nextInteraction.prompt,
            choices: parsed.nextInteraction.choices.map((choice) => ({
              id: choice.id,
              label: choice.label,
              ...(choice.outcomeHint
                ? { outcomeHint: choice.outcomeHint }
                : {}),
            })),
          },
        }
      : {}),
    ...(parsed.cliffhanger ? { cliffhanger: parsed.cliffhanger } : {}),
    summaryUpdate: parsed.summaryUpdate,
    memoryUpdate: normalizeMemoryUpdate(parsed.memoryUpdate),
  };
}

// normalizeMemoryUpdate removes undefined optionals to match exact domain contracts.
function normalizeMemoryUpdate(
  payload: z.infer<typeof seriesMemoryUpdatePayloadSchema>,
): SeriesMemoryUpdatePayload {
  return {
    ...(payload.currentConflict
      ? { currentConflict: payload.currentConflict }
      : {}),
    knownFacts: payload.knownFacts,
    openQuestions: payload.openQuestions,
    importantObjectsOrLocations: payload.importantObjectsOrLocations,
    lastEpisodeSummary: payload.lastEpisodeSummary,
    unresolvedCliffhanger: payload.unresolvedCliffhanger,
    recurringStoryWordIds: payload.recurringStoryWordIds,
  };
}

// buildCompactSeriesMemoryPayload strips local sync metadata before AI requests.
export function buildCompactSeriesMemoryPayload(
  memory: SeriesMemory,
): CompactSeriesMemoryPayload {
  return {
    premise: memory.premise,
    genre: memory.genre,
    tone: memory.tone,
    mainCharacters: memory.mainCharacters,
    ...(memory.userRole ? { userRole: memory.userRole } : {}),
    ...(memory.currentConflict
      ? { currentConflict: memory.currentConflict }
      : {}),
    knownFacts: memory.knownFacts,
    openQuestions: memory.openQuestions,
    importantObjectsOrLocations: memory.importantObjectsOrLocations,
    ...(memory.lastEpisodeSummary
      ? { lastEpisodeSummary: memory.lastEpisodeSummary }
      : {}),
    ...(memory.unresolvedCliffhanger
      ? { unresolvedCliffhanger: memory.unresolvedCliffhanger }
      : {}),
    recurringStoryWordIds: memory.recurringStoryWordIds,
  };
}

// sentenceFramePayloadSchema validates the reader layout data returned by the AI boundary.
const sentenceFramePayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('narration'),
    text: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal('dialogue'),
    speaker: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1),
  }),
]);

// annotationPayloadSchema validates inline translation hints from AI output.
const annotationPayloadSchema = z.object({
  wordId: z.string().trim().min(1).optional(),
  surfaceText: z.string().trim().min(1),
  translation: z.string().trim().min(1),
  transcription: z.string().trim().min(1).optional(),
  sentenceIndex: z.number().int().nonnegative(),
});

// episodeAiPayloadSchema mirrors the future generate-episode structured JSON.
const episodeAiPayloadSchema = z
  .object({
    previouslyRecap: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    sceneText: z.string().trim().min(1),
    sentences: z.array(z.string().trim().min(1)).min(1),
    sentenceFrames: z.array(sentenceFramePayloadSchema).min(1),
    storyWordIds: z.array(z.string().trim().min(1)),
    annotations: z.array(annotationPayloadSchema),
    interaction: z.object({
      kind: z.literal(interactionKinds[0]),
      prompt: z.string().trim().min(1),
      choices: z.array(
        z.object({
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          outcomeHint: z.string().trim().min(1).optional(),
        }),
      ),
    }),
    cliffhanger: z.string().trim().min(1),
    summaryUpdate: z.string().trim().min(1),
    memoryUpdate: z.lazy(() => seriesMemoryUpdatePayloadSchema),
  })
  .superRefine((payload, context) => {
    if (payload.sceneText !== payload.sentences.join(' ')) {
      context.addIssue({
        code: 'custom',
        message: 'sceneText must match sentences in reading order',
        path: ['sceneText'],
      });
    }

    validateSentenceFrames(payload.sentences, payload.sentenceFrames, context, [
      'sentenceFrames',
    ]);

    if (payload.memoryUpdate.lastEpisodeSummary !== payload.summaryUpdate) {
      context.addIssue({
        code: 'custom',
        message: 'memory summary must match episode summary',
        path: ['memoryUpdate', 'lastEpisodeSummary'],
      });
    }

    if (payload.memoryUpdate.unresolvedCliffhanger !== payload.cliffhanger) {
      context.addIssue({
        code: 'custom',
        message: 'memory cliffhanger must match episode cliffhanger',
        path: ['memoryUpdate', 'unresolvedCliffhanger'],
      });
    }

    if (
      payload.interaction.kind === 'choice' &&
      (payload.interaction.choices.length < 2 ||
        payload.interaction.choices.length > 3)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'choice interaction must contain two or three choices',
        path: ['interaction', 'choices'],
      });
    }

    for (const [annotationIndex, annotation] of payload.annotations.entries()) {
      if (annotation.sentenceIndex >= payload.sentences.length) {
        context.addIssue({
          code: 'custom',
          message: 'annotation sentence index is outside the sentence list',
          path: ['annotations', annotationIndex, 'sentenceIndex'],
        });
      }
    }
  });

// interactionAiPayloadSchema mirrors the future submit-interaction structured JSON.
const interactionAiPayloadSchema = z
  .object({
    feedback: z.string().trim().min(1),
    continuationText: z.string().trim().min(1),
    continuationSentences: z.array(z.string().trim().min(1)).min(1),
    continuationSentenceFrames: z.array(sentenceFramePayloadSchema).min(1),
    continuationAnnotations: z.array(annotationPayloadSchema),
    isEpisodeComplete: z.boolean(),
    nextInteraction: z
      .object({
        kind: z.literal(interactionKinds[0]),
        prompt: z.string().trim().min(1),
        choices: z
          .array(
            z.object({
              id: z.string().trim().min(1),
              label: z.string().trim().min(1),
              outcomeHint: z.string().trim().min(1).optional(),
            }),
          )
          .min(2)
          .max(3),
      })
      .optional(),
    cliffhanger: z.string().trim().min(1).optional(),
    summaryUpdate: z.string().trim().min(1),
    memoryUpdate: z.lazy(() => seriesMemoryUpdatePayloadSchema),
  })
  .superRefine((payload, context) => {
    if (payload.continuationText !== payload.continuationSentences.join(' ')) {
      context.addIssue({
        code: 'custom',
        message: 'continuationText must match continuation sentences',
        path: ['continuationText'],
      });
    }

    validateSentenceFrames(
      payload.continuationSentences,
      payload.continuationSentenceFrames,
      context,
      ['continuationSentenceFrames'],
    );

    for (const [
      annotationIndex,
      annotation,
    ] of payload.continuationAnnotations.entries()) {
      if (annotation.sentenceIndex >= payload.continuationSentences.length) {
        context.addIssue({
          code: 'custom',
          message: 'continuation annotation sentence index is outside the sentence list',
          path: [
            'continuationAnnotations',
            annotationIndex,
            'sentenceIndex',
          ],
        });
      }
    }

    if (payload.memoryUpdate.lastEpisodeSummary !== payload.summaryUpdate) {
      context.addIssue({
        code: 'custom',
        message: 'memory summary must match interaction summary',
        path: ['memoryUpdate', 'lastEpisodeSummary'],
      });
    }

    if (payload.isEpisodeComplete && !payload.cliffhanger) {
      context.addIssue({
        code: 'custom',
        message: 'completed episode must include a cliffhanger',
        path: ['cliffhanger'],
      });
    }

    if (payload.isEpisodeComplete && payload.nextInteraction) {
      context.addIssue({
        code: 'custom',
        message: 'completed episode must not include another interaction',
        path: ['nextInteraction'],
      });
    }

    if (!payload.isEpisodeComplete && !payload.nextInteraction) {
      context.addIssue({
        code: 'custom',
        message: 'continuing episode must include the next interaction',
        path: ['nextInteraction'],
      });
    }

    if (!payload.isEpisodeComplete && payload.cliffhanger) {
      context.addIssue({
        code: 'custom',
        message: 'continuing episode must not include a final cliffhanger',
        path: ['cliffhanger'],
      });
    }
  });

// seriesMemoryUpdatePayloadSchema accepts only bounded compact memory fields.
const seriesMemoryUpdatePayloadSchema = z.object({
  currentConflict: z.string().trim().min(1).optional(),
  knownFacts: z.array(z.string().trim().min(1)),
  openQuestions: z.array(z.string().trim().min(1)),
  importantObjectsOrLocations: z.array(z.string().trim().min(1)),
  lastEpisodeSummary: z.string().trim().min(1),
  unresolvedCliffhanger: z.string().trim().min(1),
  recurringStoryWordIds: z.array(z.string().trim().min(1)),
});

// validateSentenceFrames ensures reader layout cannot drift from playback text.
function validateSentenceFrames(
  sentences: readonly string[],
  frames: readonly z.infer<typeof sentenceFramePayloadSchema>[],
  context: z.RefinementCtx,
  path: readonly string[],
): void {
  if (frames.length !== sentences.length) {
    context.addIssue({
      code: 'custom',
      message: 'sentence frames must match sentence count',
      path: [...path],
    });

    return;
  }

  frames.forEach((frame, index) => {
    if (frame.text !== sentences[index]) {
      context.addIssue({
        code: 'custom',
        message: 'sentence frame text must match sentence text',
        path: [...path, index, 'text'],
      });
    }
  });
}

// cefrLevelSchema validates generation request construction in tests and adapters.
export const cefrLevelSchema = z.enum(cefrLevels);

// learningGenreSchema validates generation request construction in tests and adapters.
export const learningGenreSchema = z.enum(learningGenres);
