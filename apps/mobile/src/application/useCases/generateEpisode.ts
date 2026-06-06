import {
  buildCompactSeriesMemoryPayload,
  SAFETY_AND_COPYRIGHT_CONSTRAINTS,
  type EpisodeAiPayload,
  type SeriesMemoryUpdatePayload,
} from "@application/ai/episodeAiPayload";
import type {
  Clock,
  EpisodeGenerationGateway,
  LocalSeriesStore,
  NetworkStatus,
  VocabularyCatalog,
} from "@application/ports";
import type {
  Episode,
  LearningSignal,
  SeriesMemory,
  SyncMetadata,
  VocabularyItem,
  WordSet,
} from "@domain/index";

// GenerateEpisodeInput contains the locally selected series and Story Words set.
export type GenerateEpisodeInput = {
  // seriesId identifies the local story that receives the generated episode.
  readonly seriesId: string;
  // episodeWordSet is the editable current Story Words selection.
  readonly episodeWordSet: WordSet;
};

// GenerateEpisodeResult returns the locally persisted episode after validation.
export type GenerateEpisodeResult = {
  // episode is saved locally before the UI opens the reader.
  readonly episode: Episode;
};

// GenerateEpisode coordinates online AI generation and local-first persistence.
export type GenerateEpisode = {
  // execute validates local context, calls the AI boundary, then persists the episode.
  readonly execute: (
    input: GenerateEpisodeInput,
  ) => Promise<GenerateEpisodeResult>;
};

// createGenerateEpisode injects storage, vocabulary, network, and AI boundary ports.
export function createGenerateEpisode(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  networkStatus: NetworkStatus,
  gateway: EpisodeGenerationGateway,
  clock: Clock,
): GenerateEpisode {
  return {
    execute: async ({ episodeWordSet, seriesId }) => {
      const connectivity = await networkStatus.getCurrentState();

      if (!connectivity.isOnline) {
        throw new Error("Episode generation is available only when online.");
      }

      const [series, memory, episodes, vocabulary] = await Promise.all([
        store.getSeries(seriesId),
        store.getSeriesMemory(seriesId),
        store.listEpisodes(seriesId),
        catalog.list(),
      ]);

      if (!series || !memory) {
        throw new Error(
          "Series context is required before episode generation.",
        );
      }

      const words = resolveStoryWords(vocabulary, episodeWordSet.wordIds);
      const orderIndex = episodes.length + 1;
      const payload = await gateway.generateEpisode({
        seriesId,
        orderIndex,
        cefrLevel: series.cefrLevel,
        genre: series.genre,
        tone: series.tone,
        premise: series.premise,
        mainCharacters: series.mainCharacters,
        ...(series.userRole ? { userRole: series.userRole } : {}),
        selectedStoryWords: words.map((word) => ({
          id: word.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          level: word.level,
        })),
        compactSeriesMemory: buildCompactSeriesMemoryPayload(memory),
        ...(memory.lastEpisodeSummary
          ? { lastEpisodeSummary: memory.lastEpisodeSummary }
          : {}),
        safetyAndCopyrightConstraints: SAFETY_AND_COPYRIGHT_CONSTRAINTS,
      });
      const timestamp = clock.now().toISOString();
      const episodeId = `episode:${seriesId}:${Date.parse(timestamp)}`;
      const episode = buildEpisode({
        episodeId,
        orderIndex,
        payload,
        seriesId,
        timestamp,
      });
      const updatedMemory = applyMemoryUpdate({
        memory,
        payload: payload.memoryUpdate,
        timestamp,
      });

      await store.saveEpisode(episode);
      await store.saveSeriesMemory(updatedMemory);
      await store.saveWordSet({
        ...episodeWordSet,
        id: `episode-words:${episodeId}`,
        episodeId,
        seriesId,
        updatedAt: timestamp,
        sync: createDirtySync(timestamp, `episode-words:${episodeId}`),
      });
      await Promise.all(
        episode.storyWordIds.map((wordId) =>
          store.saveLearningSignal(
            createWordSignal({
              episodeId,
              kind: "encountered",
              seriesId,
              timestamp,
              wordId,
            }),
          ),
        ),
      );

      return { episode };
    },
  };
}

// buildEpisode maps validated AI JSON to the local Episode domain record.
function buildEpisode({
  episodeId,
  orderIndex,
  payload,
  seriesId,
  timestamp,
}: {
  // episodeId is the local-first identifier created before sync.
  readonly episodeId: string;
  // orderIndex stores deterministic reading order.
  readonly orderIndex: number;
  // payload is already validated structured AI output.
  readonly payload: EpisodeAiPayload;
  // seriesId links the episode to its continuity root.
  readonly seriesId: string;
  // timestamp is the local write time.
  readonly timestamp: string;
}): Episode {
  return {
    id: episodeId,
    seriesId,
    orderIndex,
    ...(payload.previouslyRecap
      ? { previouslyRecap: payload.previouslyRecap }
      : {}),
    ...(payload.title ? { title: payload.title } : {}),
    sceneText: payload.sceneText,
    sentences: payload.sentences,
    storyWordIds: payload.storyWordIds,
    annotations: payload.annotations,
    interactions: [
      {
        id: `interaction:${episodeId}:1`,
        episodeId,
        kind: payload.interaction.kind,
        prompt: payload.interaction.prompt,
        choices: payload.interaction.choices,
        sentenceEndIndex: payload.sentences.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    isComplete: false,
    summaryUpdate: payload.summaryUpdate,
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: createDirtySync(timestamp, episodeId),
  };
}

// applyMemoryUpdate merges only the bounded AI memory patch into local memory.
export function applyMemoryUpdate({
  memory,
  payload,
  timestamp,
}: {
  // memory is the existing compact continuity record.
  readonly memory: SeriesMemory;
  // payload is the validated AI memory patch.
  readonly payload: SeriesMemoryUpdatePayload;
  // timestamp records the local write time.
  readonly timestamp: string;
}): SeriesMemory {
  return {
    ...memory,
    ...(payload.currentConflict
      ? { currentConflict: payload.currentConflict }
      : {}),
    knownFacts: payload.knownFacts,
    openQuestions: payload.openQuestions,
    importantObjectsOrLocations: payload.importantObjectsOrLocations,
    lastEpisodeSummary: payload.lastEpisodeSummary,
    unresolvedCliffhanger: payload.unresolvedCliffhanger,
    recurringStoryWordIds: unique([
      ...memory.recurringStoryWordIds,
      ...payload.recurringStoryWordIds,
    ]),
    updatedAt: timestamp,
    sync: createDirtySync(timestamp, memory.id),
  };
}

// createDirtySync marks records for future Supabase data sync.
function createDirtySync(timestamp: string, recordId: string): SyncMetadata {
  return {
    isDirty: true,
    pendingOperationId: `${timestamp}:${recordId}:ai-update`,
  };
}

// createWordSignal records non-punitive vocabulary usage after episode generation.
function createWordSignal({
  episodeId,
  kind,
  seriesId,
  timestamp,
  wordId,
}: {
  // episodeId links the signal to generated context.
  readonly episodeId: string;
  // kind records the vocabulary event without a review queue.
  readonly kind: LearningSignal["kind"];
  // seriesId scopes the signal to the personal story.
  readonly seriesId: string;
  // timestamp is the local event time.
  readonly timestamp: string;
  // wordId links the signal to the bundled Oxford vocabulary item.
  readonly wordId: string;
}): LearningSignal {
  return {
    id: `signal:${seriesId}:${episodeId}:${wordId}:${kind}`,
    wordId,
    kind,
    seriesId,
    episodeId,
    occurredAt: timestamp,
    updatedAt: timestamp,
    sync: createDirtySync(timestamp, `signal:${episodeId}:${wordId}:${kind}`),
  };
}

// resolveStoryWords maps selected ids to bundled vocabulary items.
function resolveStoryWords(
  vocabulary: readonly VocabularyItem[],
  wordIds: readonly string[],
): readonly VocabularyItem[] {
  const wordsById = new Map(vocabulary.map((word) => [word.id, word]));

  return wordIds.flatMap((wordId) => {
    const word = wordsById.get(wordId);

    return word ? [word] : [];
  });
}

// unique removes duplicate ids while preserving first occurrence.
function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
