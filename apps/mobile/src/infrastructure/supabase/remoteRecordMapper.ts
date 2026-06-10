import { z } from 'zod';

import type {
  RemoteSeriesSnapshot,
  SyncRecord,
} from '@application/ports';
import {
  cefrLevels,
  interactionKinds,
  learningGenres,
  learningSignalKinds,
  wordSetKinds,
  type Episode,
  type EpisodeInteraction,
  type EpisodeSentenceFrame,
  type LearningPreferences,
  type LearningSignal,
  type Series,
  type SeriesMemory,
  type SyncMetadata,
  type TranslationAnnotation,
  type WordSet,
} from '@domain/index';

// RemoteWrite contains the Supabase table and validated row payload for one record.
export type RemoteWrite = {
  // table selects the RLS-protected Supabase relation.
  readonly table:
    | 'series'
    | 'series_memory'
    | 'episodes'
    | 'word_sets'
    | 'learning_signals'
    | 'preferences';
  // row is the snake_case transport representation accepted by PostgREST.
  readonly row: Record<string, unknown>;
};

// RemoteSnapshotRows groups untrusted PostgREST result arrays before validation.
export type RemoteSnapshotRows = {
  // series contains raw story-root rows.
  readonly series: unknown;
  // seriesMemories contains raw bounded-memory rows.
  readonly seriesMemories: unknown;
  // episodes contains raw generated episode rows.
  readonly episodes: unknown;
  // wordSets contains raw vocabulary-group rows.
  readonly wordSets: unknown;
  // learningSignals contains raw vocabulary-event rows.
  readonly learningSignals: unknown;
  // preferences contains raw singleton preference rows.
  readonly preferences: unknown;
};

const timestampSchema = z.string().datetime({ offset: true });
const stringArraySchema = z.array(z.string());
const syncColumnsSchema = z.object({
  client_updated_at: timestampSchema,
  last_operation_id: z.string().min(1),
  server_updated_at: timestampSchema,
});
const ownedColumnsSchema = syncColumnsSchema.extend({
  user_id: z.string().uuid(),
});
const interactionChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isSpeech: z.boolean().optional(),
  outcomeHint: z.string().min(1).optional(),
});
const interactionSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  kind: z.enum(interactionKinds),
  prompt: z.string().min(1),
  choices: z.array(interactionChoiceSchema),
  sentenceEndIndex: z.number().int().nonnegative(),
  selectedChoiceId: z.string().min(1).optional(),
  userReply: z.string().min(1).optional(),
  feedback: z.string().min(1).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
const annotationSchema = z.object({
  wordId: z.string().min(1).optional(),
  surfaceText: z.string().min(1),
  translation: z.string().min(1),
  transcription: z.string().min(1).optional(),
  sentenceIndex: z.number().int().nonnegative(),
});
const sentenceFrameSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('narration'),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal('dialogue'),
    speaker: z.string().min(1),
    text: z.string().min(1),
  }),
]);
const seriesRowSchema = ownedColumnsSchema.extend({
  id: z.string().min(1),
  title: z.string().min(1),
  genre: z.enum(learningGenres),
  cefr_level: z.enum(cefrLevels),
  tone: z.string().min(1),
  premise: z.string().min(1),
  main_characters: stringArraySchema,
  user_role: z.string().nullable(),
  created_at: timestampSchema,
});
const seriesMemoryRowSchema = ownedColumnsSchema.extend({
  id: z.string().min(1),
  series_id: z.string().min(1),
  premise: z.string().min(1),
  genre: z.string().min(1),
  tone: z.string().min(1),
  main_characters: stringArraySchema,
  user_role: z.string().nullable(),
  current_conflict: z.string().nullable(),
  known_facts: stringArraySchema,
  open_questions: stringArraySchema,
  important_objects_or_locations: stringArraySchema,
  last_episode_summary: z.string().nullable(),
  unresolved_cliffhanger: z.string().nullable(),
  recurring_story_word_ids: stringArraySchema,
});
const episodeRowSchema = ownedColumnsSchema.extend({
  id: z.string().min(1),
  series_id: z.string().min(1),
  order_index: z.number().int().positive(),
  previously_recap: z.string().nullable(),
  title: z.string().nullable(),
  scene_text: z.string().min(1),
  sentences: stringArraySchema,
  sentence_frames: z.array(sentenceFrameSchema).default([]),
  story_word_ids: stringArraySchema,
  annotations: z.array(annotationSchema),
  interactions: z.array(interactionSchema),
  is_complete: z.boolean(),
  cliffhanger: z.string().nullable(),
  summary_update: z.string().min(1),
  created_at: timestampSchema,
});
const wordSetRowSchema = ownedColumnsSchema.extend({
  id: z.string().min(1),
  kind: z.enum(wordSetKinds),
  series_id: z.string().nullable(),
  episode_id: z.string().nullable(),
  date_key: z.string().nullable(),
  word_ids: stringArraySchema,
  created_at: timestampSchema,
});
const learningSignalRowSchema = ownedColumnsSchema.extend({
  id: z.string().min(1),
  word_id: z.string().min(1),
  kind: z.enum(learningSignalKinds),
  series_id: z.string().nullable(),
  episode_id: z.string().nullable(),
  occurred_at: timestampSchema,
});
const preferencesRowSchema = ownedColumnsSchema.extend({
  preferred_cefr_level: z.enum(cefrLevels),
  preferred_genre: z.enum(learningGenres),
  story_word_goal: z.number().int().min(0).max(12),
});

// serializeSyncRecord maps domain names to the RLS-protected database contract.
export function serializeSyncRecord(
  ownerId: string,
  record: SyncRecord,
): RemoteWrite {
  switch (record.kind) {
    case 'series':
      return {
        table: 'series',
        row: {
          id: record.value.id,
          user_id: ownerId,
          title: record.value.title,
          genre: record.value.genre,
          cefr_level: record.value.cefrLevel,
          tone: record.value.tone,
          premise: record.value.premise,
          main_characters: record.value.mainCharacters,
          user_role: record.value.userRole ?? null,
          created_at: record.value.createdAt,
          ...serializeVersion(record.value),
        },
      };
    case 'seriesMemory':
      return {
        table: 'series_memory',
        row: {
          id: record.value.id,
          series_id: record.value.seriesId,
          user_id: ownerId,
          premise: record.value.premise,
          genre: record.value.genre,
          tone: record.value.tone,
          main_characters: record.value.mainCharacters,
          user_role: record.value.userRole ?? null,
          current_conflict: record.value.currentConflict ?? null,
          known_facts: record.value.knownFacts,
          open_questions: record.value.openQuestions,
          important_objects_or_locations:
            record.value.importantObjectsOrLocations,
          last_episode_summary: record.value.lastEpisodeSummary ?? null,
          unresolved_cliffhanger:
            record.value.unresolvedCliffhanger ?? null,
          recurring_story_word_ids: record.value.recurringStoryWordIds,
          ...serializeVersion(record.value),
        },
      };
    case 'episode':
      return {
        table: 'episodes',
        row: {
          id: record.value.id,
          series_id: record.value.seriesId,
          user_id: ownerId,
          order_index: record.value.orderIndex,
          previously_recap: record.value.previouslyRecap ?? null,
          title: record.value.title ?? null,
          scene_text: record.value.sceneText,
          sentences: record.value.sentences,
          sentence_frames: record.value.sentenceFrames,
          story_word_ids: record.value.storyWordIds,
          annotations: record.value.annotations,
          interactions: record.value.interactions,
          is_complete: record.value.isComplete,
          cliffhanger: record.value.cliffhanger ?? null,
          summary_update: record.value.summaryUpdate,
          created_at: record.value.createdAt,
          ...serializeVersion(record.value),
        },
      };
    case 'wordSet':
      return {
        table: 'word_sets',
        row: {
          id: record.value.id,
          user_id: ownerId,
          kind: record.value.kind,
          series_id: record.value.seriesId ?? null,
          episode_id: record.value.episodeId ?? null,
          date_key: record.value.dateKey ?? null,
          word_ids: record.value.wordIds,
          created_at: record.value.createdAt,
          ...serializeVersion(record.value),
        },
      };
    case 'learningSignal':
      return {
        table: 'learning_signals',
        row: {
          id: record.value.id,
          user_id: ownerId,
          word_id: record.value.wordId,
          kind: record.value.kind,
          series_id: record.value.seriesId ?? null,
          episode_id: record.value.episodeId ?? null,
          occurred_at: record.value.occurredAt,
          ...serializeVersion(record.value),
        },
      };
    case 'preferences':
      return {
        table: 'preferences',
        row: {
          user_id: ownerId,
          preferred_cefr_level: record.value.preferredCefrLevel,
          preferred_genre: record.value.preferredGenre,
          story_word_goal: record.value.storyWordGoal,
          ...serializeVersion(record.value),
        },
      };
  }
}

// parseUpsertedRecord validates one canonical row returned after an atomic upsert.
export function parseUpsertedRecord(
  ownerId: string,
  source: SyncRecord,
  value: unknown,
): SyncRecord {
  switch (source.kind) {
    case 'series':
      return {
        kind: 'series',
        value: parseSeries(ownerId, value, source.value.memory),
      };
    case 'seriesMemory':
      return {
        kind: 'seriesMemory',
        value: parseSeriesMemory(ownerId, value),
      };
    case 'episode':
      return { kind: 'episode', value: parseEpisode(ownerId, value) };
    case 'wordSet':
      return { kind: 'wordSet', value: parseWordSet(ownerId, value) };
    case 'learningSignal':
      return {
        kind: 'learningSignal',
        value: parseLearningSignal(ownerId, value),
      };
    case 'preferences':
      return {
        kind: 'preferences',
        value: parsePreferences(ownerId, value),
      };
  }
}

// parseRemoteSnapshot validates all remote rows and restores domain relationships.
export function parseRemoteSnapshot(
  ownerId: string,
  rows: RemoteSnapshotRows,
): RemoteSeriesSnapshot {
  const seriesMemories = z
    .array(seriesMemoryRowSchema)
    .parse(rows.seriesMemories)
    .map((row) => mapSeriesMemory(ownerId, row));
  const memoryBySeriesId = new Map(
    seriesMemories.map((memory) => [memory.seriesId, memory]),
  );
  const series = z.array(seriesRowSchema).parse(rows.series).map((row) => {
    const memory = memoryBySeriesId.get(row.id);

    if (!memory) {
      throw new Error(`Remote series ${row.id} is missing series memory.`);
    }

    return mapSeries(ownerId, row, memory);
  });
  const preferenceRows = z.array(preferencesRowSchema).parse(rows.preferences);
  const preferences = preferenceRows[0]
    ? mapPreferences(ownerId, preferenceRows[0])
    : undefined;

  return {
    series,
    seriesMemories,
    episodes: z
      .array(episodeRowSchema)
      .parse(rows.episodes)
      .map((row) => mapEpisode(ownerId, row)),
    wordSets: z
      .array(wordSetRowSchema)
      .parse(rows.wordSets)
      .map((row) => mapWordSet(ownerId, row)),
    learningSignals: z
      .array(learningSignalRowSchema)
      .parse(rows.learningSignals)
      .map((row) => mapLearningSignal(ownerId, row)),
    ...(preferences ? { preferences } : {}),
  };
}

// serializeVersion maps the deterministic client version to database columns.
function serializeVersion(record: {
  readonly updatedAt: string;
  readonly sync: SyncMetadata;
}): Record<string, string> {
  return {
    client_updated_at: record.updatedAt,
    last_operation_id: record.sync.pendingOperationId,
  };
}

// parseSeries validates one upserted series while retaining its related memory.
function parseSeries(
  ownerId: string,
  value: unknown,
  memory: SeriesMemory,
): Series {
  return mapSeries(ownerId, seriesRowSchema.parse(value), memory);
}

// mapSeries converts one validated remote story root to the domain contract.
function mapSeries(
  ownerId: string,
  row: z.infer<typeof seriesRowSchema>,
  memory: SeriesMemory,
): Series {
  assertOwner(ownerId, row.user_id);

  return {
    id: row.id,
    ownerId,
    title: row.title,
    genre: row.genre,
    cefrLevel: row.cefr_level,
    tone: row.tone,
    premise: row.premise,
    mainCharacters: row.main_characters,
    ...(row.user_role ? { userRole: row.user_role } : {}),
    memory,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// parseSeriesMemory validates one remote bounded-memory record.
function parseSeriesMemory(ownerId: string, value: unknown): SeriesMemory {
  return mapSeriesMemory(ownerId, seriesMemoryRowSchema.parse(value));
}

// mapSeriesMemory converts one validated memory row to the domain contract.
function mapSeriesMemory(
  ownerId: string,
  row: z.infer<typeof seriesMemoryRowSchema>,
): SeriesMemory {
  assertOwner(ownerId, row.user_id);

  return {
    id: row.id,
    seriesId: row.series_id,
    premise: row.premise,
    genre: row.genre,
    tone: row.tone,
    mainCharacters: row.main_characters,
    ...(row.user_role ? { userRole: row.user_role } : {}),
    ...(row.current_conflict
      ? { currentConflict: row.current_conflict }
      : {}),
    knownFacts: row.known_facts,
    openQuestions: row.open_questions,
    importantObjectsOrLocations: row.important_objects_or_locations,
    ...(row.last_episode_summary
      ? { lastEpisodeSummary: row.last_episode_summary }
      : {}),
    ...(row.unresolved_cliffhanger
      ? { unresolvedCliffhanger: row.unresolved_cliffhanger }
      : {}),
    recurringStoryWordIds: row.recurring_story_word_ids,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// parseEpisode validates one remote generated learning unit.
function parseEpisode(ownerId: string, value: unknown): Episode {
  return mapEpisode(ownerId, episodeRowSchema.parse(value));
}

// mapEpisode converts one validated episode row to the domain contract.
function mapEpisode(
  ownerId: string,
  row: z.infer<typeof episodeRowSchema>,
): Episode {
  assertOwner(ownerId, row.user_id);
  const sentenceFrames =
    row.sentence_frames.length > 0
      ? row.sentence_frames.map(mapSentenceFrame)
      : row.sentences.map(createNarrationFrame);

  validateEpisodeSentenceFrames(row.sentences, sentenceFrames);

  return {
    id: row.id,
    seriesId: row.series_id,
    orderIndex: row.order_index,
    ...(row.previously_recap
      ? { previouslyRecap: row.previously_recap }
      : {}),
    ...(row.title ? { title: row.title } : {}),
    sceneText: row.scene_text,
    sentences: row.sentences,
    sentenceFrames,
    storyWordIds: row.story_word_ids,
    annotations: row.annotations.map(mapAnnotation),
    interactions: row.interactions.map(mapInteraction),
    isComplete: row.is_complete,
    ...(row.cliffhanger ? { cliffhanger: row.cliffhanger } : {}),
    summaryUpdate: row.summary_update,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// validateEpisodeSentenceFrames prevents corrupted remote layout metadata from reaching UI.
function validateEpisodeSentenceFrames(
  sentences: readonly string[],
  frames: readonly EpisodeSentenceFrame[],
): void {
  if (frames.length !== sentences.length) {
    throw new Error('Remote sentence frame count must match sentences.');
  }

  frames.forEach((frame, index) => {
    if (frame.text !== sentences[index]) {
      throw new Error('Remote sentence frame text must match sentence.');
    }
  });
}

// mapAnnotation removes undefined optional keys for exact domain contracts.
function mapAnnotation(
  annotation: z.infer<typeof annotationSchema>,
): TranslationAnnotation {
  return {
    ...(annotation.wordId ? { wordId: annotation.wordId } : {}),
    surfaceText: annotation.surfaceText,
    translation: annotation.translation,
    ...(annotation.transcription
      ? { transcription: annotation.transcription }
      : {}),
    sentenceIndex: annotation.sentenceIndex,
  };
}

// mapSentenceFrame removes impossible optional fields from remote reader layout JSON.
function mapSentenceFrame(
  frame: z.infer<typeof sentenceFrameSchema>,
): EpisodeSentenceFrame {
  if (frame.kind === 'dialogue') {
    return {
      kind: 'dialogue',
      speaker: frame.speaker,
      text: frame.text,
    };
  }

  return createNarrationFrame(frame.text);
}

// createNarrationFrame migrates remote episodes created before sentence frame support.
function createNarrationFrame(text: string): EpisodeSentenceFrame {
  return {
    kind: 'narration',
    text,
  };
}

// mapInteraction removes undefined optional keys from nested remote JSON.
function mapInteraction(
  interaction: z.infer<typeof interactionSchema>,
): EpisodeInteraction {
  return {
    id: interaction.id,
    episodeId: interaction.episodeId,
    kind: interaction.kind,
    prompt: interaction.prompt,
    choices: interaction.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      ...(choice.isSpeech === false ? { isSpeech: false } : {}),
      ...(choice.outcomeHint ? { outcomeHint: choice.outcomeHint } : {}),
    })),
    sentenceEndIndex: interaction.sentenceEndIndex,
    ...(interaction.selectedChoiceId
      ? { selectedChoiceId: interaction.selectedChoiceId }
      : {}),
    ...(interaction.userReply ? { userReply: interaction.userReply } : {}),
    ...(interaction.feedback ? { feedback: interaction.feedback } : {}),
    createdAt: interaction.createdAt,
    updatedAt: interaction.updatedAt,
  };
}

// parseWordSet validates one remote Story Words group.
function parseWordSet(ownerId: string, value: unknown): WordSet {
  return mapWordSet(ownerId, wordSetRowSchema.parse(value));
}

// mapWordSet converts one validated word-set row to the domain contract.
function mapWordSet(
  ownerId: string,
  row: z.infer<typeof wordSetRowSchema>,
): WordSet {
  assertOwner(ownerId, row.user_id);

  return {
    id: row.id,
    kind: row.kind,
    ...(row.series_id ? { seriesId: row.series_id } : {}),
    ...(row.episode_id ? { episodeId: row.episode_id } : {}),
    ...(row.date_key ? { dateKey: row.date_key } : {}),
    wordIds: row.word_ids,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// parseLearningSignal validates one remote vocabulary event.
function parseLearningSignal(
  ownerId: string,
  value: unknown,
): LearningSignal {
  return mapLearningSignal(ownerId, learningSignalRowSchema.parse(value));
}

// mapLearningSignal converts one validated signal row to the domain contract.
function mapLearningSignal(
  ownerId: string,
  row: z.infer<typeof learningSignalRowSchema>,
): LearningSignal {
  assertOwner(ownerId, row.user_id);

  return {
    id: row.id,
    wordId: row.word_id,
    kind: row.kind,
    ...(row.series_id ? { seriesId: row.series_id } : {}),
    ...(row.episode_id ? { episodeId: row.episode_id } : {}),
    occurredAt: row.occurred_at,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// parsePreferences validates one remote singleton settings row.
function parsePreferences(
  ownerId: string,
  value: unknown,
): LearningPreferences {
  return mapPreferences(ownerId, preferencesRowSchema.parse(value));
}

// mapPreferences converts one validated preference row to the domain contract.
function mapPreferences(
  ownerId: string,
  row: z.infer<typeof preferencesRowSchema>,
): LearningPreferences {
  assertOwner(ownerId, row.user_id);

  return {
    preferredCefrLevel: row.preferred_cefr_level,
    preferredGenre: row.preferred_genre,
    storyWordGoal: row.story_word_goal,
    updatedAt: row.client_updated_at,
    sync: mapCleanSync(row),
  };
}

// mapCleanSync marks a validated remote row as fully applied locally.
function mapCleanSync(row: {
  readonly last_operation_id: string;
  readonly server_updated_at: string;
}): SyncMetadata {
  return {
    isDirty: false,
    pendingOperationId: row.last_operation_id,
    lastSyncedAt: row.server_updated_at,
  };
}

// assertOwner provides defense in depth beyond database RLS.
function assertOwner(expectedOwnerId: string, actualOwnerId: string): void {
  if (actualOwnerId !== expectedOwnerId) {
    throw new Error('Remote record ownership does not match the active session.');
  }
}
