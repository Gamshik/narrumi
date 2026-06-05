import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { LearningPreferences, WordSet } from '@domain/index';
import { DEFAULT_EPISODE_WORD_COUNT, DEFAULT_STORY_WORD_GOAL } from '@domain/index';

// StartOrResumeTodaysWordSetInput optionally overrides automatic Story Word count.
export type StartOrResumeTodaysWordSetInput = {
  // storyWordGoal controls automatic suggestions without creating a required queue.
  readonly storyWordGoal?: number;
};

// StartOrResumeTodaysWordSetResult returns the lightweight Today's Words set.
export type StartOrResumeTodaysWordSetResult = {
  // wordSet is the local Word Picker set persisted in AsyncStorage.
  readonly wordSet: WordSet;
};

// StartOrResumeTodaysWordSet assembles local Story Words without scheduled reviews.
export type StartOrResumeTodaysWordSet = {
  // execute loads preferences, vocabulary, signals, then persists a local word set.
  readonly execute: (
    input?: StartOrResumeTodaysWordSetInput,
  ) => Promise<StartOrResumeTodaysWordSetResult>;
};

// createStartOrResumeTodaysWordSet injects local storage, catalog, and time sources.
export function createStartOrResumeTodaysWordSet(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  clock: Clock,
): StartOrResumeTodaysWordSet {
  return {
    execute: async (input = {}) => {
      const now = clock.now();
      const dateKey = toDateKey(now);
      const existing = await store.listWordSets({ dateKey });
      const todaySet = existing.find((wordSet) => wordSet.kind === 'today');

      if (todaySet) {
        return { wordSet: todaySet };
      }

      const preferences = await ensurePreferences(store, clock);
      const signals = await store.listLearningSignals();
      const knownOrLaterWordIds = new Set(
        signals
          .filter((signal) => signal.kind === 'known' || signal.kind === 'later')
          .map((signal) => signal.wordId),
      );
      const vocabulary = await catalog.list();
      const wordIds = vocabulary
        .filter((word) => !knownOrLaterWordIds.has(word.id))
        .slice(0, input.storyWordGoal ?? preferences.storyWordGoal)
        .map((word) => word.id);
      const timestamp = now.toISOString();
      const wordSet: WordSet = {
        id: `today:${dateKey}`,
        kind: 'today',
        dateKey,
        wordIds,
        createdAt: timestamp,
        updatedAt: timestamp,
        sync: {
          isDirty: true,
          pendingOperationId: `${timestamp}:word-set:${dateKey}:create`,
        },
      };

      await store.saveWordSet(wordSet);

      return { wordSet };
    },
  };
}

// ensurePreferences saves local series defaults if the user has not configured them yet.
async function ensurePreferences(
  store: LocalSeriesStore,
  clock: Clock,
): Promise<LearningPreferences> {
  const existing = await store.getPreferences();

  if (existing) {
    return existing;
  }

  const timestamp = clock.now().toISOString();
  const preferences: LearningPreferences = {
    preferredCefrLevel: 'B1',
    preferredGenre: 'short-fiction',
    storyWordGoal: DEFAULT_STORY_WORD_GOAL,
    episodeWordCount: DEFAULT_EPISODE_WORD_COUNT,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId: `${timestamp}:preferences:create`,
    },
  };

  await store.savePreferences(preferences);

  return preferences;
}

// toDateKey creates the local Today's Words id for a calendar day.
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
