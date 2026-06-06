import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  LocalLearningSignalFilter,
  LocalSeriesStore,
  LocalWordSetFilter,
} from '@application/ports';
import {
  cefrLevels,
  clampStoryWordGoal,
  type Episode,
  interactionKinds,
  type LearningGenre,
  type LearningPreferences,
  type LearningSignal,
  learningGenres,
  learningSignalKinds,
  type Series,
  type SeriesMemory,
  type SyncMetadata,
  type WordSet,
  wordSetKinds,
} from '@domain/index';

// UnknownRecord is the safe object shape used while validating local storage data.
type UnknownRecord = Record<string, unknown>;

// STORAGE_KEYS centralizes AsyncStorage keys owned by the local series adapter.
const STORAGE_KEYS = {
  episodes: '@context-english/episodes',
  learningSignals: '@context-english/learning-signals',
  preferences: '@context-english/preferences',
  series: '@context-english/series',
  seriesMemory: '@context-english/series-memory',
  syncMetadata: '@context-english/sync-metadata',
  wordSets: '@context-english/word-sets',
} as const;

// AsyncStorageLocalSeriesStore persists offline series data and sync metadata.
export class AsyncStorageLocalSeriesStore implements LocalSeriesStore {
  // getPreferences reads validated local series generation defaults.
  async getPreferences(): Promise<LearningPreferences | undefined> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.preferences);

    if (!rawValue) {
      return undefined;
    }

    try {
      return parsePreferences(JSON.parse(rawValue));
    } catch {
      // Invalid legacy preferences must not permanently block settings writes.
      await AsyncStorage.removeItem(STORAGE_KEYS.preferences);

      return undefined;
    }
  }

  // savePreferences writes local series defaults for offline use.
  async savePreferences(preferences: LearningPreferences): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify(preferences),
    );
  }

  // listSeries returns all validated personal series records.
  async listSeries(): Promise<readonly Series[]> {
    const records = await this.readSeriesMap();

    return Object.values(records).sort(compareUpdatedAtDescending);
  }

  // getSeries returns one validated local series when present.
  async getSeries(seriesId: string): Promise<Series | undefined> {
    const records = await this.readSeriesMap();

    return records[seriesId];
  }

  // saveSeries upserts one local-first series immediately.
  async saveSeries(series: Series): Promise<void> {
    const records = await this.readSeriesMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.series,
      JSON.stringify({ ...records, [series.id]: series }),
    );
  }

  // listEpisodes returns validated episodes for a series in reading order.
  async listEpisodes(seriesId: string): Promise<readonly Episode[]> {
    const records = await this.readEpisodeMap();

    return Object.values(records)
      .filter((episode) => episode.seriesId === seriesId)
      .sort((left, right) => left.orderIndex - right.orderIndex);
  }

  // getEpisode returns one validated local episode when present.
  async getEpisode(episodeId: string): Promise<Episode | undefined> {
    const records = await this.readEpisodeMap();

    return records[episodeId];
  }

  // saveEpisode upserts one local-first episode immediately.
  async saveEpisode(episode: Episode): Promise<void> {
    const records = await this.readEpisodeMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.episodes,
      JSON.stringify({ ...records, [episode.id]: episode }),
    );
  }

  // getSeriesMemory returns compact continuity context for one series.
  async getSeriesMemory(seriesId: string): Promise<SeriesMemory | undefined> {
    const records = await this.readSeriesMemoryMap();

    return records[seriesId];
  }

  // saveSeriesMemory upserts bounded continuity context immediately.
  async saveSeriesMemory(memory: SeriesMemory): Promise<void> {
    const records = await this.readSeriesMemoryMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.seriesMemory,
      JSON.stringify({ ...records, [memory.seriesId]: memory }),
    );
  }

  // listWordSets returns validated word groups with optional story scoping.
  async listWordSets(
    filter: LocalWordSetFilter = {},
  ): Promise<readonly WordSet[]> {
    const records = await this.readWordSetMap();

    return Object.values(records).filter((wordSet) => {
      return (
        matchesOptional(wordSet.seriesId, filter.seriesId) &&
        matchesOptional(wordSet.episodeId, filter.episodeId) &&
        matchesOptional(wordSet.dateKey, filter.dateKey)
      );
    });
  }

  // saveWordSet upserts one local-first word group immediately.
  async saveWordSet(wordSet: WordSet): Promise<void> {
    const records = await this.readWordSetMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.wordSets,
      JSON.stringify({ ...records, [wordSet.id]: wordSet }),
    );
  }

  // listLearningSignals returns validated internal vocabulary events.
  async listLearningSignals(
    filter: LocalLearningSignalFilter = {},
  ): Promise<readonly LearningSignal[]> {
    const records = await this.readLearningSignalMap();

    return Object.values(records).filter((signal) => {
      return (
        matchesOptional(signal.wordId, filter.wordId) &&
        matchesOptional(signal.seriesId, filter.seriesId) &&
        matchesOptional(signal.episodeId, filter.episodeId)
      );
    });
  }

  // saveLearningSignal upserts one non-punitive vocabulary event immediately.
  async saveLearningSignal(signal: LearningSignal): Promise<void> {
    const records = await this.readLearningSignalMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.learningSignals,
      JSON.stringify({ ...records, [signal.id]: signal }),
    );
  }

  // getSyncMetadata returns standalone sync state for a local record.
  async getSyncMetadata(recordId: string): Promise<SyncMetadata | undefined> {
    const records = await this.readSyncMetadataMap();

    return records[recordId];
  }

  // saveSyncMetadata upserts standalone sync state for future reconciliation.
  async saveSyncMetadata(
    recordId: string,
    metadata: SyncMetadata,
  ): Promise<void> {
    const records = await this.readSyncMetadataMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.syncMetadata,
      JSON.stringify({ ...records, [recordId]: metadata }),
    );
  }

  // readSeriesMap validates mutable local series records before use cases read them.
  private async readSeriesMap(): Promise<Record<string, Series>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.series);

    return rawValue ? parseRecordMap(JSON.parse(rawValue), parseSeries) : {};
  }

  // readEpisodeMap validates mutable local episode records before use cases read them.
  private async readEpisodeMap(): Promise<Record<string, Episode>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.episodes);

    return rawValue ? parseRecordMap(JSON.parse(rawValue), parseEpisode) : {};
  }

  // readSeriesMemoryMap validates mutable compact memory records before use.
  private async readSeriesMemoryMap(): Promise<Record<string, SeriesMemory>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.seriesMemory);

    return rawValue
      ? parseRecordMap(JSON.parse(rawValue), parseSeriesMemory)
      : {};
  }

  // readWordSetMap validates mutable local word-set records before use.
  private async readWordSetMap(): Promise<Record<string, WordSet>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.wordSets);

    return rawValue ? parseRecordMap(JSON.parse(rawValue), parseWordSet) : {};
  }

  // readLearningSignalMap validates mutable local signal records before use.
  private async readLearningSignalMap(): Promise<Record<string, LearningSignal>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.learningSignals);

    return rawValue
      ? parseRecordMap(JSON.parse(rawValue), parseLearningSignal)
      : {};
  }

  // readSyncMetadataMap validates mutable standalone sync metadata before use.
  private async readSyncMetadataMap(): Promise<Record<string, SyncMetadata>> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.syncMetadata);

    return rawValue ? parseRecordMap(JSON.parse(rawValue), parseSyncMetadata) : {};
  }
}

// isRecord narrows unknown JSON before property access.
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// parseRecordMap validates an AsyncStorage object map and drops invalid entries.
function parseRecordMap<T>(
  value: unknown,
  parseEntry: (value: unknown) => T,
): Record<string, T> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, T>>(
    (records, [key, entry]) => {
      try {
        return { ...records, [key]: parseEntry(entry) };
      } catch {
        return records;
      }
    },
    {},
  );
}

// parsePreferences validates local settings and reapplies product bounds.
function parsePreferences(value: unknown): LearningPreferences {
  if (!isRecord(value)) {
    throw new Error('Learning preferences must be an object');
  }

  const preferredCefrLevel = readString(value, 'preferredCefrLevel');
  const preferredGenre = readString(value, 'preferredGenre');

  if (!cefrLevels.includes(preferredCefrLevel as LearningPreferences['preferredCefrLevel'])) {
    throw new Error('Preferred CEFR level is unsupported');
  }

  if (!isLearningGenre(preferredGenre)) {
    throw new Error('Preferred genre is unsupported');
  }

  return {
    preferredCefrLevel: preferredCefrLevel as LearningPreferences['preferredCefrLevel'],
    preferredGenre,
    storyWordGoal: clampStoryWordGoal(readNumber(value, 'storyWordGoal')),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseSeries validates one local-first personal series record.
function parseSeries(value: unknown): Series {
  if (!isRecord(value)) {
    throw new Error('Series must be an object');
  }

  const genre = readString(value, 'genre');
  const cefrLevel = readString(value, 'cefrLevel');
  const ownerId = readOptionalString(value, 'ownerId');
  const userRole = readOptionalString(value, 'userRole');

  if (!isLearningGenre(genre)) {
    throw new Error('Series genre is unsupported');
  }

  if (!cefrLevels.includes(cefrLevel as Series['cefrLevel'])) {
    throw new Error('Series CEFR level is unsupported');
  }

  return {
    id: readString(value, 'id'),
    ...(ownerId ? { ownerId } : {}),
    title: readString(value, 'title'),
    genre,
    cefrLevel: cefrLevel as Series['cefrLevel'],
    tone: readString(value, 'tone'),
    premise: readString(value, 'premise'),
    mainCharacters: readStringArray(value, 'mainCharacters'),
    ...(userRole ? { userRole } : {}),
    memory: parseSeriesMemory(value.memory),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseSeriesMemory validates bounded continuity context.
function parseSeriesMemory(value: unknown): SeriesMemory {
  if (!isRecord(value)) {
    throw new Error('Series memory must be an object');
  }

  const userRole = readOptionalString(value, 'userRole');
  const currentConflict = readOptionalString(value, 'currentConflict');
  const lastEpisodeSummary = readOptionalString(value, 'lastEpisodeSummary');
  const unresolvedCliffhanger = readOptionalString(value, 'unresolvedCliffhanger');

  return {
    id: readString(value, 'id'),
    seriesId: readString(value, 'seriesId'),
    premise: readString(value, 'premise'),
    genre: readString(value, 'genre'),
    tone: readString(value, 'tone'),
    mainCharacters: readStringArray(value, 'mainCharacters'),
    ...(userRole ? { userRole } : {}),
    ...(currentConflict ? { currentConflict } : {}),
    knownFacts: readStringArray(value, 'knownFacts'),
    openQuestions: readStringArray(value, 'openQuestions'),
    importantObjectsOrLocations: readStringArray(
      value,
      'importantObjectsOrLocations',
    ),
    ...(lastEpisodeSummary ? { lastEpisodeSummary } : {}),
    ...(unresolvedCliffhanger ? { unresolvedCliffhanger } : {}),
    recurringStoryWordIds: readStringArray(value, 'recurringStoryWordIds'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseEpisode validates one generated learning unit before rendering or sync.
function parseEpisode(value: unknown): Episode {
  if (!isRecord(value)) {
    throw new Error('Episode must be an object');
  }

  const previouslyRecap = readOptionalString(value, 'previouslyRecap');
  const title = readOptionalString(value, 'title');

  return {
    id: readString(value, 'id'),
    seriesId: readString(value, 'seriesId'),
    orderIndex: readNumber(value, 'orderIndex'),
    ...(previouslyRecap ? { previouslyRecap } : {}),
    ...(title ? { title } : {}),
    sceneText: readString(value, 'sceneText'),
    sentences: readStringArray(value, 'sentences'),
    storyWordIds: readStringArray(value, 'storyWordIds'),
    annotations: readArray(value, 'annotations').map(parseTranslationAnnotation),
    interaction: parseEpisodeInteraction(value.interaction),
    cliffhanger: readString(value, 'cliffhanger'),
    summaryUpdate: readString(value, 'summaryUpdate'),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseTranslationAnnotation validates one inline translation hint.
function parseTranslationAnnotation(value: unknown): Episode['annotations'][number] {
  if (!isRecord(value)) {
    throw new Error('Translation annotation must be an object');
  }

  const wordId = readOptionalString(value, 'wordId');
  const transcription = readOptionalString(value, 'transcription');

  return {
    ...(wordId ? { wordId } : {}),
    surfaceText: readString(value, 'surfaceText'),
    translation: readString(value, 'translation'),
    ...(transcription ? { transcription } : {}),
    sentenceIndex: readNumber(value, 'sentenceIndex'),
  };
}

// parseEpisodeInteraction validates the episode's single interaction point.
function parseEpisodeInteraction(value: unknown): Episode['interaction'] {
  if (!isRecord(value)) {
    throw new Error('Episode interaction must be an object');
  }

  const kind = readString(value, 'kind');
  const selectedChoiceId = readOptionalString(value, 'selectedChoiceId');
  const userReply = readOptionalString(value, 'userReply');
  const feedback = readOptionalString(value, 'feedback');

  if (!interactionKinds.includes(kind as Episode['interaction']['kind'])) {
    throw new Error('Episode interaction kind is unsupported');
  }

  return {
    id: readString(value, 'id'),
    episodeId: readString(value, 'episodeId'),
    kind: kind as Episode['interaction']['kind'],
    prompt: readString(value, 'prompt'),
    choices: readArray(value, 'choices').map(parseInteractionChoice),
    ...(selectedChoiceId ? { selectedChoiceId } : {}),
    ...(userReply ? { userReply } : {}),
    ...(feedback ? { feedback } : {}),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
  };
}

// parseInteractionChoice validates one controlled story option.
function parseInteractionChoice(
  value: unknown,
): Episode['interaction']['choices'][number] {
  if (!isRecord(value)) {
    throw new Error('Episode interaction choice must be an object');
  }

  const outcomeHint = readOptionalString(value, 'outcomeHint');

  return {
    id: readString(value, 'id'),
    label: readString(value, 'label'),
    ...(outcomeHint ? { outcomeHint } : {}),
  };
}

// parseWordSet validates one local Story Words group.
function parseWordSet(value: unknown): WordSet {
  if (!isRecord(value)) {
    throw new Error('Word set must be an object');
  }

  const kind = readString(value, 'kind');
  const seriesId = readOptionalString(value, 'seriesId');
  const episodeId = readOptionalString(value, 'episodeId');
  const dateKey = readOptionalString(value, 'dateKey');

  if (!wordSetKinds.includes(kind as WordSet['kind'])) {
    throw new Error('Word set kind is unsupported');
  }

  return {
    id: readString(value, 'id'),
    kind: kind as WordSet['kind'],
    ...(seriesId ? { seriesId } : {}),
    ...(episodeId ? { episodeId } : {}),
    ...(dateKey ? { dateKey } : {}),
    wordIds: readStringArray(value, 'wordIds'),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseLearningSignal validates one internal non-punitive vocabulary event.
function parseLearningSignal(value: unknown): LearningSignal {
  if (!isRecord(value)) {
    throw new Error('Learning signal must be an object');
  }

  const kind = readString(value, 'kind');
  const seriesId = readOptionalString(value, 'seriesId');
  const episodeId = readOptionalString(value, 'episodeId');

  if (!learningSignalKinds.includes(kind as LearningSignal['kind'])) {
    throw new Error('Learning signal kind is unsupported');
  }

  return {
    id: readString(value, 'id'),
    wordId: readString(value, 'wordId'),
    kind: kind as LearningSignal['kind'],
    ...(seriesId ? { seriesId } : {}),
    ...(episodeId ? { episodeId } : {}),
    occurredAt: readString(value, 'occurredAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseSyncMetadata validates dirty metadata used by future Supabase sync.
function parseSyncMetadata(value: unknown): SyncMetadata {
  if (!isRecord(value)) {
    throw new Error('Sync metadata must be an object');
  }

  const lastSyncedAt = readOptionalString(value, 'lastSyncedAt');

  return {
    isDirty: readBoolean(value, 'isDirty'),
    pendingOperationId: readString(value, 'pendingOperationId'),
    ...(lastSyncedAt ? { lastSyncedAt } : {}),
  };
}

// isLearningGenre narrows local strings to the approved MVP genre set.
function isLearningGenre(value: string): value is LearningGenre {
  return learningGenres.includes(value as LearningGenre);
}

// matchesOptional applies a filter only when the caller provided a value.
function matchesOptional(value: string | undefined, filter: string | undefined): boolean {
  return filter === undefined || value === filter;
}

// compareUpdatedAtDescending keeps local series lists stable and recent-first.
function compareUpdatedAtDescending(
  left: { readonly updatedAt: string },
  right: { readonly updatedAt: string },
): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

// readString validates a required string field from local storage.
function readString(record: UnknownRecord, key: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string`);
  }

  return value.trim();
}

// readOptionalString validates an optional string field from local storage.
function readOptionalString(
  record: UnknownRecord,
  key: string,
): string | undefined {
  const value = record[key];

  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string when provided`);
  }

  return value.trim() || undefined;
}

// readNumber validates a required finite number field from local storage.
function readNumber(record: UnknownRecord, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number`);
  }

  return value;
}

// readBoolean validates a required boolean field from local storage.
function readBoolean(record: UnknownRecord, key: string): boolean {
  const value = record[key];

  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean`);
  }

  return value;
}

// readArray validates an array field before mapping entries through a parser.
function readArray(record: UnknownRecord, key: string): readonly unknown[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  return value;
}

// readStringArray validates string lists persisted inside local records.
function readStringArray(
  record: UnknownRecord,
  key: string,
): readonly string[] {
  return readArray(record, key).filter(
    (entry): entry is string => typeof entry === 'string',
  );
}
