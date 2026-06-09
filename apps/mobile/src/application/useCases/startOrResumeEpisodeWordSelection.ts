import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { LearningPreferences, VocabularyItem, WordSet } from '@domain/index';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';

import { selectStoryWordIds } from './storyWordSelection';

// CURRENT_EPISODE_WORD_SET_ID stores the last edited episode word selection.
const CURRENT_EPISODE_WORD_SET_ID = 'episode:current-story-words';

// StartOrResumeEpisodeWordSelectionResult returns today's source and current episode picks.
export type StartOrResumeEpisodeWordSelectionResult = {
  // preferences controls how many Story Words are proposed.
  readonly preferences: LearningPreferences;
  // todayWordSet is the immutable daily suggestion source for this local day.
  readonly todayWordSet: WordSet;
  // episodeWordSet is the editable current selection used for AI generation.
  readonly episodeWordSet: WordSet;
  // words are the resolved visible vocabulary items for the current episode set.
  readonly words: readonly VocabularyItem[];
};

// StartOrResumeEpisodeWordSelection prepares the unified Story Words -> Episode flow.
export type StartOrResumeEpisodeWordSelection = {
  // execute loads or creates local word sets without remote generation.
  readonly execute: () => Promise<StartOrResumeEpisodeWordSelectionResult>;
};

// createStartOrResumeEpisodeWordSelection injects local storage and vocabulary ports.
export function createStartOrResumeEpisodeWordSelection(
  store: LocalSeriesStore,
  catalog: VocabularyCatalog,
  clock: Clock,
): StartOrResumeEpisodeWordSelection {
  return {
    execute: async () => {
      const now = clock.now();
      const timestamp = now.toISOString();
      const dateKey = toDateKey(now);
      const preferences = await ensurePreferences(store, clock);
      const vocabulary = await catalog.list();
      const todayWordSet = await ensureTodayWordSet({
        dateKey,
        preferences,
        store,
        timestamp,
        vocabulary,
      });
      const episodeWordSet = await ensureEpisodeWordSet({
        preferences,
        store,
        timestamp,
        todayWordSet,
        vocabulary,
      });
      const wordsById = new Map(vocabulary.map((word) => [word.id, word]));
      const words = episodeWordSet.wordIds.flatMap((wordId) => {
        const word = wordsById.get(wordId);

        return word ? [word] : [];
      });

      return { preferences, todayWordSet, episodeWordSet, words };
    },
  };
}

// ensureTodayWordSet creates the local day source only when none exists yet.
async function ensureTodayWordSet({
  dateKey,
  preferences,
  store,
  timestamp,
  vocabulary,
}: {
  // dateKey scopes the immutable daily word source.
  readonly dateKey: string;
  // preferences provides the configured suggestion count.
  readonly preferences: LearningPreferences;
  // store persists the local-first word set.
  readonly store: LocalSeriesStore;
  // timestamp is the local write time.
  readonly timestamp: string;
  // vocabulary is the bundled Oxford catalog.
  readonly vocabulary: readonly VocabularyItem[];
}): Promise<WordSet> {
  const existing = await store.listWordSets({ dateKey });
  const todayWordSet = existing.find((wordSet) => wordSet.kind === 'today');

  if (todayWordSet) {
    return todayWordSet;
  }

  const wordSet: WordSet = {
    id: `today:${dateKey}`,
    kind: 'today',
    dateKey,
    wordIds: selectStoryWordIds({
      goal: preferences.storyWordGoal,
      maxLevel: preferences.preferredCefrLevel,
      seed: dateKey,
      sourceWordIds: [],
      vocabulary,
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId: `${timestamp}:word-set:${dateKey}:create`,
    },
  };

  await store.saveWordSet(wordSet);

  return wordSet;
}

// ensureEpisodeWordSet normalizes the editable current set to the configured size.
async function ensureEpisodeWordSet({
  preferences,
  store,
  timestamp,
  todayWordSet,
  vocabulary,
}: {
  // preferences defines the expected Story Words count and level ceiling.
  readonly preferences: LearningPreferences;
  // store reads and writes the current editable episode set.
  readonly store: LocalSeriesStore;
  // timestamp is the local write time.
  readonly timestamp: string;
  // todayWordSet seeds the current selection when no previous set exists.
  readonly todayWordSet: WordSet;
  // vocabulary validates existing ids and fills one-time repairs.
  readonly vocabulary: readonly VocabularyItem[];
}): Promise<WordSet> {
  const existing = (await store.listWordSets()).find(
    (wordSet) => wordSet.id === CURRENT_EPISODE_WORD_SET_ID,
  );

  if (existing && canReuseEpisodeWordSet({ preferences, vocabulary, wordSet: existing })) {
    return existing;
  }

  const sourceWordIds = existing?.wordIds ?? todayWordSet.wordIds;
  const wordIds = selectStoryWordIds({
    goal: preferences.storyWordGoal,
    maxLevel: preferences.preferredCefrLevel,
    seed: existing?.updatedAt ?? timestamp,
    sourceWordIds,
    vocabulary,
  });
  const wordSet: WordSet = {
    ...(existing ?? {
      id: CURRENT_EPISODE_WORD_SET_ID,
      kind: 'episode' as const,
      createdAt: timestamp,
    }),
    wordIds,
    updatedAt: timestamp,
    sync: {
      isDirty: true,
      pendingOperationId: `${timestamp}:word-set:${CURRENT_EPISODE_WORD_SET_ID}:upsert`,
      ...(existing?.sync.lastSyncedAt ? { lastSyncedAt: existing.sync.lastSyncedAt } : {}),
    },
  };

  await store.saveWordSet(wordSet);

  return wordSet;
}

// canReuseEpisodeWordSet keeps valid last-used words stable across screen opens.
function canReuseEpisodeWordSet({
  preferences,
  vocabulary,
  wordSet,
}: {
  // preferences define the current visible Story Words contract.
  readonly preferences: LearningPreferences;
  // vocabulary resolves ids at the bundled Oxford trust boundary.
  readonly vocabulary: readonly VocabularyItem[];
  // wordSet is the stored current episode selection candidate.
  readonly wordSet: WordSet;
}): boolean {
  const normalizedWordIds = selectStoryWordIds({
    goal: preferences.storyWordGoal,
    maxLevel: preferences.preferredCefrLevel,
    seed: wordSet.updatedAt,
    sourceWordIds: wordSet.wordIds,
    vocabulary,
  });

  return areSameWordIds(wordSet.wordIds, normalizedWordIds);
}

// areSameWordIds compares stable Story Words order without rebuilding the set.
function areSameWordIds(
  leftWordIds: readonly string[],
  rightWordIds: readonly string[],
): boolean {
  return (
    leftWordIds.length === rightWordIds.length &&
    leftWordIds.every((wordId, index) => wordId === rightWordIds[index])
  );
}

// ensurePreferences saves local defaults if the user has not configured them yet.
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
