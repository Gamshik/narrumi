import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  LocalLearningSignalFilter,
  LocalSeriesStore,
  LocalWordSetFilter,
} from '@application/ports';
import {
  cefrLevels,
  clampStoryWordGoal,
  createProfilesFromCharacterNames,
  type Episode,
  interactionKinds,
  type LearningGenre,
  type LearningPreferences,
  type LearningSignal,
  learningGenres,
  learningSignalKinds,
  seriesParticipationModes,
  type Series,
  type SeriesCharacterProfile,
  type SeriesMemory,
  type SeriesParticipationMode,
  type SyncMetadata,
  type WordSet,
  normalizeCharacterProfiles,
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

  // deleteSeries removes the local story root and every directly scoped child record.
  async deleteSeries(seriesId: string): Promise<void> {
    const [
      seriesRecords,
      episodeRecords,
      memoryRecords,
      wordSetRecords,
      signalRecords,
    ] = await Promise.all([
      this.readSeriesMap(),
      this.readEpisodeMap(),
      this.readSeriesMemoryMap(),
      this.readWordSetMap(),
      this.readLearningSignalMap(),
    ]);
    const episodeIds = new Set(
      Object.values(episodeRecords)
        .filter((episode) => episode.seriesId === seriesId)
        .map((episode) => episode.id),
    );

    await Promise.all([
      AsyncStorage.setItem(
        STORAGE_KEYS.series,
        JSON.stringify(removeRecord(seriesRecords, seriesId)),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.episodes,
        JSON.stringify(
          filterRecordMap(
            episodeRecords,
            (episode) => episode.seriesId !== seriesId,
          ),
        ),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.seriesMemory,
        JSON.stringify(
          filterRecordMap(
            memoryRecords,
            (memory) => memory.seriesId !== seriesId,
          ),
        ),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.wordSets,
        JSON.stringify(
          filterRecordMap(
            wordSetRecords,
            (wordSet) =>
              wordSet.seriesId !== seriesId &&
              !matchesKnownEpisode(wordSet.episodeId, episodeIds),
          ),
        ),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.learningSignals,
        JSON.stringify(
          filterRecordMap(
            signalRecords,
            (signal) =>
              signal.seriesId !== seriesId &&
              !matchesKnownEpisode(signal.episodeId, episodeIds),
          ),
        ),
      ),
    ]);
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

  // deleteEpisode removes the episode and episode-scoped word/signal records locally.
  async deleteEpisode(episodeId: string): Promise<void> {
    const [episodeRecords, wordSetRecords, signalRecords] = await Promise.all([
      this.readEpisodeMap(),
      this.readWordSetMap(),
      this.readLearningSignalMap(),
    ]);

    await Promise.all([
      AsyncStorage.setItem(
        STORAGE_KEYS.episodes,
        JSON.stringify(removeRecord(episodeRecords, episodeId)),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.wordSets,
        JSON.stringify(
          filterRecordMap(
            wordSetRecords,
            (wordSet) => wordSet.episodeId !== episodeId,
          ),
        ),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.learningSignals,
        JSON.stringify(
          filterRecordMap(
            signalRecords,
            (signal) => signal.episodeId !== episodeId,
          ),
        ),
      ),
    ]);
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

// filterRecordMap preserves a local map shape while dropping deleted children.
function filterRecordMap<T>(
  records: Record<string, T>,
  keepRecord: (record: T, key: string) => boolean,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(records).filter(([key, record]) => keepRecord(record, key)),
  );
}

// removeRecord deletes one local map entry without mutating validated records.
function removeRecord<T>(
  records: Record<string, T>,
  recordId: string,
): Record<string, T> {
  return filterRecordMap(records, (_record, key) => key !== recordId);
}

// matchesKnownEpisode identifies episode-scoped child records during series deletion.
function matchesKnownEpisode(
  episodeId: string | undefined,
  episodeIds: ReadonlySet<string>,
): boolean {
  return episodeId !== undefined && episodeIds.has(episodeId);
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
  const participationMode = readParticipationMode(value);

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
    participationMode,
    mainCharacters: readStringArray(value, 'mainCharacters'),
    characterProfiles: readCharacterProfiles(value),
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
  const participationMode = readParticipationMode(value);
  const currentConflict = readOptionalString(value, 'currentConflict');
  const lastEpisodeSummary = readOptionalString(value, 'lastEpisodeSummary');
  const unresolvedCliffhanger = readOptionalString(value, 'unresolvedCliffhanger');

  return {
    id: readString(value, 'id'),
    seriesId: readString(value, 'seriesId'),
    premise: readString(value, 'premise'),
    genre: readString(value, 'genre'),
    tone: readString(value, 'tone'),
    participationMode,
    mainCharacters: readStringArray(value, 'mainCharacters'),
    characterProfiles: readCharacterProfiles(value),
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

// readParticipationMode migrates legacy series records to director mode.
function readParticipationMode(record: UnknownRecord): SeriesParticipationMode {
  const value = record.participationMode;

  if (value === undefined) {
    return 'director';
  }

  if (
    typeof value === 'string' &&
    seriesParticipationModes.includes(value as SeriesParticipationMode)
  ) {
    return value as SeriesParticipationMode;
  }

  throw new Error('Series participation mode is unsupported');
}

// readCharacterProfiles migrates legacy string-only characters into pinned profiles.
function readCharacterProfiles(record: UnknownRecord): readonly SeriesCharacterProfile[] {
  if (record.characterProfiles === undefined) {
    return createProfilesFromCharacterNames(readStringArray(record, 'mainCharacters'));
  }

  return normalizeCharacterProfiles(
    readArray(record, 'characterProfiles').map(parseCharacterProfile),
  );
}

// parseCharacterProfile validates one local editable character profile.
function parseCharacterProfile(value: unknown): SeriesCharacterProfile {
  if (!isRecord(value)) {
    throw new Error('Character profile must be an object');
  }

  return {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    description: readOptionalString(value, 'description') ?? '',
  };
}

// parseEpisode validates one generated learning unit before rendering or sync.
function parseEpisode(value: unknown): Episode {
  if (!isRecord(value)) {
    throw new Error('Episode must be an object');
  }

  const previouslyRecap = readOptionalString(value, 'previouslyRecap');
  const title = readOptionalString(value, 'title');
  const cliffhanger = readOptionalString(value, 'cliffhanger');
  const sentences = readStringArray(value, 'sentences');
  const sentenceFrames =
    value.sentenceFrames === undefined
      ? sentences.map(createNarrationFrame)
      : readArray(value, 'sentenceFrames').map(parseEpisodeSentenceFrame);
  const interactions = parseEpisodeInteractions(value, sentences.length);
  const isComplete =
    readOptionalBoolean(value, 'isComplete') ??
    interactions.every((interaction) => interaction.feedback !== undefined);

  validateEpisodeSentenceFrames(sentences, sentenceFrames);

  return {
    id: readString(value, 'id'),
    seriesId: readString(value, 'seriesId'),
    orderIndex: readNumber(value, 'orderIndex'),
    ...(previouslyRecap ? { previouslyRecap } : {}),
    ...(title ? { title } : {}),
    sceneText: readString(value, 'sceneText'),
    sentences,
    sentenceFrames,
    storyWordIds: readStringArray(value, 'storyWordIds'),
    annotations: readArray(value, 'annotations').map(parseTranslationAnnotation),
    interactions,
    isComplete,
    ...(cliffhanger ? { cliffhanger } : {}),
    summaryUpdate: readString(value, 'summaryUpdate'),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseEpisodeSentenceFrame validates the explicit reader layout for one sentence.
function parseEpisodeSentenceFrame(
  value: unknown,
): Episode['sentenceFrames'][number] {
  if (!isRecord(value)) {
    throw new Error('Episode sentence frame must be an object');
  }

  const kind = readString(value, 'kind');

  if (kind === 'narration') {
    return createNarrationFrame(readString(value, 'text'));
  }

  if (kind === 'dialogue') {
    return {
      kind,
      speaker: readString(value, 'speaker'),
      text: readString(value, 'text'),
    };
  }

  throw new Error('Episode sentence frame kind is unsupported');
}

// createNarrationFrame migrates legacy episodes without dialogue metadata.
function createNarrationFrame(text: string): Episode['sentenceFrames'][number] {
  return {
    kind: 'narration',
    text,
  };
}

// validateEpisodeSentenceFrames prevents corrupted local layout metadata from reaching UI.
function validateEpisodeSentenceFrames(
  sentences: readonly string[],
  frames: readonly Episode['sentenceFrames'][number][],
): void {
  if (frames.length !== sentences.length) {
    throw new Error('Episode sentence frame count must match sentences');
  }

  frames.forEach((frame, index) => {
    if (frame.text !== sentences[index]) {
      throw new Error('Episode sentence frame text must match sentence');
    }
  });
}

// parseEpisodeInteractions migrates legacy single-interaction episodes on read.
function parseEpisodeInteractions(
  value: UnknownRecord,
  sentenceCount: number,
): Episode['interactions'] {
  const storedInteractions = value.interactions;

  if (Array.isArray(storedInteractions)) {
    return storedInteractions.map((interaction) =>
      parseEpisodeInteraction(interaction, sentenceCount)
    );
  }

  if (value.interaction !== undefined) {
    return [parseEpisodeInteraction(value.interaction, sentenceCount)];
  }

  throw new Error('Episode interactions must be present');
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
function parseEpisodeInteraction(
  value: unknown,
  fallbackSentenceEndIndex: number,
): Episode['interactions'][number] {
  if (!isRecord(value)) {
    throw new Error('Episode interaction must be an object');
  }

  const kind = readString(value, 'kind');
  const selectedChoiceId = readOptionalString(value, 'selectedChoiceId');
  const userReply = readOptionalString(value, 'userReply');
  const feedback = readOptionalString(value, 'feedback');
  const sentenceEndIndex =
    readOptionalNumber(value, 'sentenceEndIndex') ?? fallbackSentenceEndIndex;

  if (
    !interactionKinds.includes(
      kind as Episode['interactions'][number]['kind'],
    )
  ) {
    throw new Error('Episode interaction kind is unsupported');
  }

  return {
    id: readString(value, 'id'),
    episodeId: readString(value, 'episodeId'),
    kind: kind as Episode['interactions'][number]['kind'],
    prompt: readString(value, 'prompt'),
    choices: readArray(value, 'choices').map(parseInteractionChoice),
    sentenceEndIndex,
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
): Episode['interactions'][number]['choices'][number] {
  if (!isRecord(value)) {
    throw new Error('Episode interaction choice must be an object');
  }

  const outcomeHint = readOptionalString(value, 'outcomeHint');
  const isSpeech = readOptionalBoolean(value, 'isSpeech');

  return {
    id: readString(value, 'id'),
    label: readString(value, 'label'),
    ...(isSpeech === false ? { isSpeech: false } : {}),
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

// readOptionalBoolean validates an optional boolean field from local storage.
function readOptionalBoolean(
  record: UnknownRecord,
  key: string,
): boolean | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${key} must be a boolean when provided`);
  }

  return value;
}

// readOptionalNumber validates an optional finite number field from local storage.
function readOptionalNumber(
  record: UnknownRecord,
  key: string,
): number | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number when provided`);
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
