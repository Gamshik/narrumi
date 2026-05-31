import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocalProgressStore } from '@application/ports';
import {
  clampDailyWordGoal,
  clampRequiredReviewCycles,
  type DailyLearningSession,
  type LearnedWordProgress,
  type LearningPreferences,
  type LearningGenre,
  learningGenres,
  practiceProgressStatuses,
} from '@domain/index';

// UnknownRecord is the safe object shape used while validating local storage data.
type UnknownRecord = Record<string, unknown>;

// STORAGE_KEYS centralizes AsyncStorage keys owned by the local progress adapter.
const STORAGE_KEYS = {
  preferences: '@context-english/preferences',
  wordProgress: '@context-english/word-progress',
  dailySessions: '@context-english/daily-sessions',
} as const;

// AsyncStorageLocalProgressStore persists offline progress and sync metadata.
export class AsyncStorageLocalProgressStore implements LocalProgressStore {
  // getPreferences reads validated local card settings.
  async getPreferences(): Promise<LearningPreferences | undefined> {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.preferences);

    return rawValue ? parsePreferences(JSON.parse(rawValue)) : undefined;
  }

  // savePreferences writes local card settings for offline sessions.
  async savePreferences(preferences: LearningPreferences): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify(preferences),
    );
  }

  // getAllWordProgress returns all validated local progress records.
  async getAllWordProgress(): Promise<readonly LearnedWordProgress[]> {
    const records = await this.readWordProgressMap();

    return Object.values(records);
  }

  // getWordProgress returns one validated progress record when present.
  async getWordProgress(
    wordId: string,
  ): Promise<LearnedWordProgress | undefined> {
    const records = await this.readWordProgressMap();

    return records[wordId];
  }

  // saveWordProgress upserts one local progress record immediately.
  async saveWordProgress(progress: LearnedWordProgress): Promise<void> {
    const records = await this.readWordProgressMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.wordProgress,
      JSON.stringify({ ...records, [progress.wordId]: progress }),
    );
  }

  // getDailySession resumes a validated local session by date key.
  async getDailySession(
    dateKey: string,
  ): Promise<DailyLearningSession | undefined> {
    const records = await this.readDailySessionMap();

    return records[dateKey];
  }

  // saveDailySession upserts one local daily session.
  async saveDailySession(session: DailyLearningSession): Promise<void> {
    const records = await this.readDailySessionMap();

    await AsyncStorage.setItem(
      STORAGE_KEYS.dailySessions,
      JSON.stringify({ ...records, [session.dateKey]: session }),
    );
  }

  // readWordProgressMap validates mutable local storage before use cases read it.
  private async readWordProgressMap(): Promise<
    Record<string, LearnedWordProgress>
  > {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.wordProgress);

    if (!rawValue) {
      return {};
    }

    return parseRecordMap(JSON.parse(rawValue), parseWordProgress);
  }

  // readDailySessionMap validates mutable local session state before presentation reads it.
  private async readDailySessionMap(): Promise<
    Record<string, DailyLearningSession>
  > {
    const rawValue = await AsyncStorage.getItem(STORAGE_KEYS.dailySessions);

    if (!rawValue) {
      return {};
    }

    return parseRecordMap(JSON.parse(rawValue), parseDailySession);
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

  return {
    dailyWordGoal: clampDailyWordGoal(readNumber(value, 'dailyWordGoal')),
    requiredReviewCycles: clampRequiredReviewCycles(
      readNumber(value, 'requiredReviewCycles'),
    ),
    updatedAt: readString(value, 'updatedAt'),
  };
}

// parseWordProgress validates one local-first progress record.
function parseWordProgress(value: unknown): LearnedWordProgress {
  if (!isRecord(value)) {
    throw new Error('Word progress must be an object');
  }

  const status = readString(value, 'status');

  if (!practiceProgressStatuses.includes(status as LearnedWordProgress['status'])) {
    throw new Error('Word progress status is unsupported');
  }

  const nextReviewAt = readOptionalString(value, 'nextReviewAt');

  return {
    wordId: readString(value, 'wordId'),
    status: status as LearnedWordProgress['status'],
    reviewCycle: readNumber(value, 'reviewCycle'),
    ...(nextReviewAt ? { nextReviewAt } : {}),
    lastPracticedAt: readString(value, 'lastPracticedAt'),
    updatedAt: readString(value, 'updatedAt'),
    sync: parseSyncMetadata(value.sync),
  };
}

// parseDailySession validates persisted daily queue and genre state.
function parseDailySession(value: unknown): DailyLearningSession {
  if (!isRecord(value)) {
    throw new Error('Daily session must be an object');
  }

  const selectedGenre = readOptionalString(value, 'selectedGenre');

  if (selectedGenre && !isLearningGenre(selectedGenre)) {
    throw new Error('Daily session genre is unsupported');
  }

  const completedAt = readOptionalString(value, 'completedAt');

  return {
    id: readString(value, 'id'),
    dateKey: readString(value, 'dateKey'),
    dailyWordGoal: clampDailyWordGoal(readNumber(value, 'dailyWordGoal')),
    wordIds: readStringArray(value, 'wordIds'),
    completedWordIds: readStringArray(value, 'completedWordIds'),
    ...(selectedGenre && isLearningGenre(selectedGenre) ? { selectedGenre } : {}),
    createdAt: readString(value, 'createdAt'),
    updatedAt: readString(value, 'updatedAt'),
    ...(completedAt ? { completedAt } : {}),
    sync: parseSyncMetadata(value.sync),
  };
}

// isLearningGenre narrows local strings to the approved MVP genre set.
function isLearningGenre(value: string): value is LearningGenre {
  return learningGenres.includes(value as LearningGenre);
}

// parseSyncMetadata validates dirty metadata used by future Supabase sync.
function parseSyncMetadata(value: unknown): LearnedWordProgress['sync'] {
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

// readStringArray validates string lists persisted inside sessions.
function readStringArray(
  record: UnknownRecord,
  key: string,
): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}
