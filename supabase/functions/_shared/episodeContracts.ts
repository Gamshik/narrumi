import { z } from 'npm:zod';

// readableTextSchema normalizes AI text for mobile reader and TTS surfaces.
const readableTextSchema = z.string().trim().min(1).transform(normalizeReadableText);

// optionalReadableTextSchema normalizes optional AI text when it is present.
const optionalReadableTextSchema = z
  .string()
  .trim()
  .min(1)
  .transform(normalizeReadableText)
  .optional();

// feedbackTextSchema removes accidental model prefixes before learner feedback is shown.
const feedbackTextSchema = readableTextSchema.transform(normalizeFeedbackText);

// interactionKinds is the Edge-side copy of supported MVP interaction kinds.
const interactionKinds = [
  'choice',
  'short-reply',
  'character-question',
  'theory-or-plan',
] as const;

// cefrLevels is the Edge-side copy of accepted learner levels.
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

// learningGenres is the Edge-side copy of approved MVP story genres.
const learningGenres = [
  'daily-life',
  'work-it',
  'travel-leisure',
  'short-fiction',
] as const;

// storyWordSchema validates one selected local Oxford word in AI context.
const storyWordSchema = z.object({
  id: z.string().trim().min(1),
  word: z.string().trim().min(1),
  partOfSpeech: z.string().trim().min(1),
  level: z.enum(cefrLevels),
});

// compactSeriesMemorySchema prevents unbounded history from entering prompts.
const compactSeriesMemorySchema = z.object({
  premise: z.string().trim().min(1),
  genre: z.string().trim().min(1),
  tone: z.string().trim().min(1),
  mainCharacters: z.array(z.string().trim().min(1)),
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
  knownFacts: z.array(readableTextSchema).max(8),
  openQuestions: z.array(readableTextSchema).max(6),
  importantObjectsOrLocations: z.array(readableTextSchema).max(6),
  lastEpisodeSummary: readableTextSchema.pipe(z.string().max(600)),
  unresolvedCliffhanger: readableTextSchema.pipe(z.string().max(300)),
  recurringStoryWordIds: z.array(z.string().trim().min(1)).max(24),
});

// episodePayloadSchema validates generate-episode structured output.
export const episodePayloadSchema = z.object({
  previouslyRecap: optionalReadableTextSchema.pipe(z.string().max(400).optional()),
  title: optionalReadableTextSchema.pipe(z.string().max(80).optional()),
  sceneText: readableTextSchema,
  sentences: z.array(readableTextSchema).min(3).max(16),
  storyWordIds: z.array(z.string().trim().min(1)).max(24),
  annotations: z.array(
    z.object({
      wordId: z.string().trim().min(1).optional(),
      surfaceText: readableTextSchema,
      translation: readableTextSchema,
      transcription: optionalReadableTextSchema,
      sentenceIndex: z.number().int().nonnegative(),
    }),
  ),
  interaction: z.object({
    kind: z.literal(interactionKinds[0]),
    prompt: readableTextSchema.pipe(z.string().max(300)),
    choices: z.array(
      z.object({
        id: z.string().trim().min(1),
        label: readableTextSchema.pipe(z.string().max(120)),
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
  continuationText: readableTextSchema.pipe(z.string().max(600)),
  continuationSentences: z.array(readableTextSchema).min(1).max(8),
  summaryUpdate: readableTextSchema.pipe(z.string().max(600)),
  memoryUpdate: seriesMemoryUpdateSchema,
});

// generateEpisodeRequestSchema validates untrusted mobile generation requests.
export const generateEpisodeRequestSchema = z.object({
  seriesId: z.string().trim().min(1),
  orderIndex: z.number().int().positive(),
  cefrLevel: z.enum(cefrLevels),
  genre: z.enum(learningGenres),
  tone: z.string().trim().min(1).max(120),
  premise: z.string().trim().min(1).max(1000),
  mainCharacters: z.array(z.string().trim().min(1)).max(8),
  userRole: z.string().trim().min(1).max(160).optional(),
  selectedStoryWords: z.array(storyWordSchema).max(24),
  compactSeriesMemory: compactSeriesMemorySchema,
  lastEpisodeSummary: z.string().trim().min(1).max(600).optional(),
  safetyAndCopyrightConstraints: z.array(z.string().trim().min(1)).min(1),
});

// submitInteractionRequestSchema validates untrusted mobile interaction requests.
export const submitInteractionRequestSchema = z.object({
  episodeId: z.string().trim().min(1),
  seriesId: z.string().trim().min(1),
  cefrLevel: z.enum(cefrLevels),
  genre: z.enum(learningGenres),
  tone: z.string().trim().min(1).max(120),
  compactSeriesMemory: compactSeriesMemorySchema,
  episodeSummary: z.string().trim().min(1).max(600),
  interactionPrompt: z.string().trim().min(1).max(300),
  selectedChoiceId: z.string().trim().min(1).optional(),
  selectedChoiceLabel: z.string().trim().min(1).max(120).optional(),
  userReply: z.string().trim().min(1).max(500).optional(),
  safetyAndCopyrightConstraints: z.array(z.string().trim().min(1)).min(1),
});

// GenerateEpisodeRequest is the parsed Edge request contract.
export type GenerateEpisodeRequest = z.infer<typeof generateEpisodeRequestSchema>;

// SubmitInteractionRequest is the parsed Edge request contract.
export type SubmitInteractionRequest = z.infer<typeof submitInteractionRequestSchema>;

// EpisodePayload is the validated server response before cross-field finalization.
export type EpisodePayload = z.infer<typeof episodePayloadSchema>;

// InteractionPayload is the validated server response before cross-field finalization.
export type InteractionPayload = z.infer<typeof interactionPayloadSchema>;

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
