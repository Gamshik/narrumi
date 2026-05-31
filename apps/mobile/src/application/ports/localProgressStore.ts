import type {
  DailyLearningSession,
  LearnedWordProgress,
  LearningPreferences,
} from '@domain/index';

// LocalProgressStore is the application port for immediate offline progress writes.
export type LocalProgressStore = {
  // getPreferences reads local card settings or returns undefined before first setup.
  readonly getPreferences: () => Promise<LearningPreferences | undefined>;
  // savePreferences persists local card settings before any future remote sync.
  readonly savePreferences: (preferences: LearningPreferences) => Promise<void>;
  // getAllWordProgress reads every validated local word progress record.
  readonly getAllWordProgress: () => Promise<readonly LearnedWordProgress[]>;
  // getWordProgress reads one local word progress record by vocabulary id.
  readonly getWordProgress: (
    wordId: string,
  ) => Promise<LearnedWordProgress | undefined>;
  // saveWordProgress persists one local word progress record immediately.
  readonly saveWordProgress: (progress: LearnedWordProgress) => Promise<void>;
  // getDailySession resumes the local session for a date key when it exists.
  readonly getDailySession: (
    dateKey: string,
  ) => Promise<DailyLearningSession | undefined>;
  // saveDailySession persists the local session and dirty metadata.
  readonly saveDailySession: (session: DailyLearningSession) => Promise<void>;
};
