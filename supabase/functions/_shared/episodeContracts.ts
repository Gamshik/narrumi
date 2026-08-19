import { z } from 'npm:zod@4.4.3';

// readableTextSchema normalizes AI text for mobile reader and TTS surfaces.
const readableTextSchema = z.string().trim().min(1).transform(normalizeReadableText);

// optionalReadableTextSchema normalizes optional AI text when it is present.
const optionalReadableTextSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().min(1).transform(normalizeReadableText).optional(),
);

// feedbackTextSchema removes accidental model prefixes before learner feedback is shown.
const feedbackTextSchema = readableTextSchema.transform(normalizeFeedbackText);

// AI_MEMORY_ARRAY_DRAFT_LIMIT accepts verbose drafts before deterministic finalization.
const AI_MEMORY_ARRAY_DRAFT_LIMIT = 32;

// PREVIOUS_DECISION_DRAFT_LIMIT accepts older clients while prompts stay bounded later.
const PREVIOUS_DECISION_DRAFT_LIMIT = 64;

// interactionKinds is the Edge-side copy of supported MVP interaction kinds.
const interactionKinds = [
  'choice',
  'short-reply',
  'character-question',
  'theory-or-plan',
] as const;

// freeReplyIntents disambiguate learner-authored text before creative generation.
const freeReplyIntents = ['speech', 'action', 'direction'] as const;

// cefrLevels is the Edge-side copy of accepted learner levels.
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

// learningGenres is the Edge-side copy of approved MVP story genres.
const learningGenres = [
  'daily-life',
  'comedy',
  'romance',
  'drama',
  'work-it',
  'travel-leisure',
  'cozy-mystery',
  'detective',
  'adventure',
  'thriller',
  'fantasy',
  'science-fiction',
  'short-fiction',
] as const;

// seriesParticipationModes is the Edge-side copy of supported learner influence modes.
const seriesParticipationModes = ['director', 'character'] as const;

// sentenceFrameSchema is the explicit display contract for one playback sentence.
const sentenceFrameSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('narration'),
    text: readableTextSchema,
  }),
  z.object({
    kind: z.literal('dialogue'),
    speaker: readableTextSchema.pipe(z.string().max(80)),
    text: readableTextSchema,
  }),
]);

// storyWordSchema validates one selected local Oxford word in AI context.
const storyWordSchema = z.object({
  id: z.string().trim().min(1),
  word: z.string().trim().min(1),
  partOfSpeech: z.string().trim().min(1),
  level: z.enum(cefrLevels),
  usageExamples: z
    .array(z.string().trim().min(1).max(240))
    .max(2)
    .optional(),
});

// characterProfileSchema pins dialogue labels while carrying role context for generation.
const characterProfileSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
});

// annotationSchema validates context-aware translation hints for generated text.
const annotationSchema = z.object({
  wordId: z.string().trim().min(1).optional(),
  surfaceText: readableTextSchema,
  translation: readableTextSchema,
  transcription: optionalReadableTextSchema,
  sentenceIndex: z.number().int().nonnegative(),
});

// compactSeriesMemorySchema prevents unbounded history from entering prompts.
const compactSeriesMemorySchema = z.object({
  premise: z.string().trim().min(1),
  participationMode: z.enum(seriesParticipationModes).default('director'),
  mainCharacters: z.array(z.string().trim().min(1)),
  characterProfiles: z.array(characterProfileSchema).max(8).default([]),
  userRole: z.string().trim().min(1).optional(),
  currentConflict: z.string().trim().min(1).optional(),
  knownFacts: z.array(z.string().trim().min(1)),
  openQuestions: z.array(z.string().trim().min(1)),
  importantObjectsOrLocations: z.array(z.string().trim().min(1)),
  lastEpisodeSummary: z.string().trim().min(1).optional(),
  unresolvedCliffhanger: z.string().trim().min(1).optional(),
  recurringStoryWordIds: z.array(z.string().trim().min(1)),
});

// seriesMemoryUpdateSchema validates only bounded memory fields written by AI.
export const seriesMemoryUpdateSchema = z.object({
  currentConflict: optionalReadableTextSchema,
  knownFacts: z.array(readableTextSchema).max(AI_MEMORY_ARRAY_DRAFT_LIMIT),
  openQuestions: z.array(readableTextSchema).max(AI_MEMORY_ARRAY_DRAFT_LIMIT),
  importantObjectsOrLocations: z
    .array(readableTextSchema)
    .max(AI_MEMORY_ARRAY_DRAFT_LIMIT),
  lastEpisodeSummary: readableTextSchema.pipe(z.string().max(600)),
  unresolvedCliffhanger: readableTextSchema.pipe(z.string().max(300)),
  recurringStoryWordIds: z
    .array(z.string().trim().min(1))
    .max(AI_MEMORY_ARRAY_DRAFT_LIMIT),
});

// episodePayloadSchema validates generate-episode structured output.
export const episodePayloadSchema = z.object({
  previouslyRecap: optionalReadableTextSchema.pipe(z.string().max(400).optional()),
  title: optionalReadableTextSchema.pipe(z.string().max(80).optional()),
  sceneText: readableTextSchema,
  sentences: z.array(readableTextSchema).min(3).max(16),
  sentenceFrames: z.array(sentenceFrameSchema).min(3).max(16),
  storyWordIds: z.array(z.string().trim().min(1)).max(24),
  annotations: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(annotationSchema),
  ),
  interaction: z.object({
    kind: z.literal(interactionKinds[0]),
    prompt: readableTextSchema.pipe(z.string().max(300)),
    choices: z.array(
      z.object({
        id: z.string().trim().min(1),
        label: readableTextSchema.pipe(z.string().max(120)),
        isSpeech: z.boolean().optional(),
        outcomeHint: optionalReadableTextSchema.pipe(z.string().max(240).optional()),
      }),
    ).min(2).max(3),
  }),
  cliffhanger: readableTextSchema.pipe(z.string().max(300)),
  summaryUpdate: readableTextSchema.pipe(z.string().max(600)),
  memoryUpdate: seriesMemoryUpdateSchema,
});

// interactionPayloadSchema validates submit-interaction structured output.
export const interactionPayloadSchema = z.object({
  feedback: feedbackTextSchema.pipe(z.string().max(500)),
  continuationText: readableTextSchema.pipe(z.string().max(1000)),
  continuationSentences: z.array(readableTextSchema).min(1).max(10),
  continuationSentenceFrames: z.array(sentenceFrameSchema).min(1).max(10),
  continuationAnnotations: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(annotationSchema),
  ),
  isEpisodeComplete: z.boolean(),
  nextInteraction: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .object({
        kind: z.literal(interactionKinds[0]),
        prompt: readableTextSchema.pipe(z.string().max(300)),
        choices: z
          .array(
            z.object({
              id: z.string().trim().min(1),
              label: readableTextSchema.pipe(z.string().max(120)),
              isSpeech: z.boolean().optional(),
              outcomeHint: optionalReadableTextSchema.pipe(
                z.string().max(240).optional(),
              ),
            }),
          )
          .min(2)
          .max(3),
      })
      .optional(),
  ),
  cliffhanger: optionalReadableTextSchema.pipe(z.string().max(300).optional()),
  summaryUpdate: readableTextSchema.pipe(z.string().max(600)),
  memoryUpdate: seriesMemoryUpdateSchema,
}).superRefine((payload, context) => {
  if (payload.isEpisodeComplete && !payload.cliffhanger) {
    context.addIssue({
      code: 'custom',
      message: 'Completed episode requires a cliffhanger.',
      path: ['cliffhanger'],
    });
  }

  if (payload.isEpisodeComplete && payload.nextInteraction) {
    context.addIssue({
      code: 'custom',
      message: 'Completed episode must not include another interaction.',
      path: ['nextInteraction'],
    });
  }

  if (!payload.isEpisodeComplete && !payload.nextInteraction) {
    context.addIssue({
      code: 'custom',
      message: 'Continuing episode requires a next interaction.',
      path: ['nextInteraction'],
    });
  }

  if (!payload.isEpisodeComplete && payload.cliffhanger) {
    context.addIssue({
      code: 'custom',
      message: 'Continuing episode must not include a final cliffhanger.',
      path: ['cliffhanger'],
    });
  }
});

// interactionRevisionPayloadSchema returns editable guidance without story mutation.
export const interactionRevisionPayloadSchema = z.object({
  status: z.literal('needs-revision'),
  guidance: z.object({
    reason: z.enum(['unclear', 'not-english', 'off-topic']),
    message: feedbackTextSchema.pipe(z.string().max(500)),
    suggestedText: readableTextSchema.pipe(z.string().max(500)).optional(),
  }),
});

// interactionAcceptedPayloadSchema adds public status and structured language coaching.
export const interactionAcceptedPayloadSchema = z.intersection(
  interactionPayloadSchema,
  z.object({
    status: z.literal('accepted'),
    languageFeedback: z
      .discriminatedUnion('status', [
        z.object({
          status: z.literal('natural'),
          note: feedbackTextSchema.pipe(z.string().max(500)),
        }),
        z.object({
          status: z.literal('corrected'),
          correctedText: readableTextSchema.pipe(z.string().max(500)),
          note: feedbackTextSchema.pipe(z.string().max(500)),
        }),
      ])
      .optional(),
  }),
);

// interactionGatewayPayloadSchema validates cached accepted and recoverable responses.
export const interactionGatewayPayloadSchema = z.union([
  interactionAcceptedPayloadSchema,
  interactionRevisionPayloadSchema,
]);

// generateEpisodeRequestSchema validates untrusted mobile generation requests.
export const generateEpisodeRequestSchema = z.object({
  generationRequestId: z.string().trim().min(1).max(240),
  seriesId: z.string().trim().min(1),
  seriesTitle: z.string().trim().min(1).max(160),
  orderIndex: z.number().int().positive(),
  cefrLevel: z.enum(cefrLevels),
  genre: z.enum(learningGenres),
  premise: z.string().trim().min(1).max(1000),
  participationMode: z.enum(seriesParticipationModes),
  mainCharacters: z.array(z.string().trim().min(1)).max(8),
  characterProfiles: z.array(characterProfileSchema).max(8).default([]),
  userRole: z.string().trim().min(1).max(160).optional(),
  selectedStoryWords: z.array(storyWordSchema).max(24),
  compactSeriesMemory: compactSeriesMemorySchema,
  lastEpisodeSummary: z.string().trim().min(1).max(600).optional(),
  safetyAndCopyrightConstraints: z.array(z.string().trim().min(1)).min(1),
}).superRefine((payload, context) => {
  if (payload.participationMode !== payload.compactSeriesMemory.participationMode) {
    context.addIssue({
      code: 'custom',
      message: 'Participation mode must match compact series memory.',
      path: ['compactSeriesMemory', 'participationMode'],
    });
  }

  if (payload.participationMode === 'character' && !payload.userRole) {
    context.addIssue({
      code: 'custom',
      message: 'Character mode requires userRole.',
      path: ['userRole'],
    });
  }
});

// submitInteractionRequestSchema validates untrusted mobile interaction requests.
export const submitInteractionRequestSchema = z.object({
  submissionId: z.string().trim().min(1).max(300).optional(),
  episodeId: z.string().trim().min(1),
  interactionId: z.string().trim().min(1),
  seriesId: z.string().trim().min(1),
  seriesTitle: z.string().trim().min(1).max(160),
  cefrLevel: z.enum(cefrLevels),
  genre: z.enum(learningGenres),
  participationMode: z.enum(seriesParticipationModes),
  compactSeriesMemory: compactSeriesMemorySchema,
  episodeSummary: z.string().trim().min(1).max(600),
  interactionPrompt: z.string().trim().min(1).max(300),
  interactionCount: z.number().int().positive(),
  previousDecisions: z
    .array(
      z.object({
        prompt: z.string().trim().min(1).max(300),
        answer: z.string().trim().min(1).max(500),
        feedback: z.string().trim().min(1).max(500).optional(),
      }),
    )
    .max(PREVIOUS_DECISION_DRAFT_LIMIT),
  selectedStoryWords: z.array(storyWordSchema).max(24),
  encounteredStoryWordIds: z.array(z.string().trim().min(1)).max(24),
  selectedChoiceId: z.string().trim().min(1).optional(),
  selectedChoiceLabel: z.string().trim().min(1).max(120).optional(),
  userReply: z.string().trim().min(1).max(500).optional(),
  replyIntent: z.enum(freeReplyIntents).optional(),
  safetyAndCopyrightConstraints: z.array(z.string().trim().min(1)).min(1),
}).superRefine((payload, context) => {
  if (payload.participationMode !== payload.compactSeriesMemory.participationMode) {
    context.addIssue({
      code: 'custom',
      message: 'Participation mode must match compact series memory.',
      path: ['compactSeriesMemory', 'participationMode'],
    });
  }

  if (payload.participationMode === 'character' && !payload.compactSeriesMemory.userRole) {
    context.addIssue({
      code: 'custom',
      message: 'Character mode requires compact memory userRole.',
      path: ['compactSeriesMemory', 'userRole'],
    });
  }

  const hasChoice: boolean =
    payload.selectedChoiceId !== undefined &&
    payload.selectedChoiceLabel !== undefined;
  const hasFreeReply: boolean =
    payload.userReply !== undefined && payload.replyIntent !== undefined;

  if (hasChoice === hasFreeReply) {
    context.addIssue({
      code: 'custom',
      message: 'Submit exactly one controlled choice or one free reply.',
      path: ['userReply'],
    });
  }

  if (
    payload.participationMode === 'character' &&
    hasFreeReply &&
    payload.replyIntent === 'direction'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Character mode free replies must be speech or action.',
      path: ['replyIntent'],
    });
  }

  if (
    payload.participationMode === 'director' &&
    hasFreeReply &&
    payload.replyIntent !== 'direction'
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Producer mode free replies must direct the scene.',
      path: ['replyIntent'],
    });
  }
}).transform((payload) => ({
  ...payload,
  // Older choice-only clients had no submission id; the interaction scope is
  // already single-use and provides a deterministic compatibility identity.
  submissionId:
    payload.submissionId ??
    `legacy-submission:${payload.episodeId}:${payload.interactionId}`,
}));

// GenerateEpisodeRequest is the parsed Edge request contract.
export type GenerateEpisodeRequest = z.infer<typeof generateEpisodeRequestSchema>;

// SubmitInteractionRequest is the parsed Edge request contract.
export type SubmitInteractionRequest = z.infer<typeof submitInteractionRequestSchema>;

// EpisodePayload is the validated server response before cross-field finalization.
export type EpisodePayload = z.infer<typeof episodePayloadSchema>;

// InteractionPayload is the validated server response before cross-field finalization.
export type InteractionPayload = z.infer<typeof interactionPayloadSchema>;

// InteractionGatewayPayload includes accepted continuation and editable guidance.
export type InteractionGatewayPayload = z.infer<
  typeof interactionGatewayPayloadSchema
>;

// normalizeReadableText removes markdown emphasis and typography that often breaks terminals/TTS.
function normalizeReadableText(value: string): string {
  return repairUtf8Mojibake(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[…]/g, '...')
    .replace(/[—–]/g, '-')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// normalizeFeedbackText removes punctuation-only prefixes without changing valid sentences.
function normalizeFeedbackText(value: string): string {
  return value.replace(/^[\s:;,-]+/, '').trim();
}

// repairUtf8Mojibake restores Cyrillic when UTF-8 bytes were emitted as Latin-1 text.
function repairUtf8Mojibake(value: string): string {
  if (!/[ÐÑ]/.test(value) || /[А-Яа-яЁё]/.test(value)) {
    return value;
  }

  const bytes = new Uint8Array(
    [...value].map((character) => character.charCodeAt(0) & 0xff),
  );

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}
