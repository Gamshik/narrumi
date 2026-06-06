import type { Clock, LocalSeriesStore, VocabularyCatalog } from '@application/ports';
import type { LearningPreferences, VocabularyItem, WordSet } from '@domain/index';
import { DEFAULT_STORY_WORD_GOAL } from '@domain/index';

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
    wordIds: vocabulary.slice(0, preferences.storyWordGoal).map((word) => word.id),
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
  // preferences provides the configured number of visible Story Words.
  readonly preferences: LearningPreferences;
  // store reads and writes the current editable episode set.
  readonly store: LocalSeriesStore;
  // timestamp is the local write time.
  readonly timestamp: string;
  // todayWordSet seeds the current selection when no previous set exists.
  readonly todayWordSet: WordSet;
  // vocabulary fills missing words when preferences increase.
  readonly vocabulary: readonly VocabularyItem[];
}): Promise<WordSet> {
  const existing = (await store.listWordSets()).find(
    (wordSet) => wordSet.id === CURRENT_EPISODE_WORD_SET_ID,
  );
  const sourceWordIds = existing?.wordIds ?? todayWordSet.wordIds;
  const normalizedWordIds = normalizeWordIds({
    goal: preferences.storyWordGoal,
    sourceWordIds,
    vocabulary,
  });
  const wordSet: WordSet = {
    ...(existing ?? {
      id: CURRENT_EPISODE_WORD_SET_ID,
      kind: 'episode' as const,
      createdAt: timestamp,
    }),
    wordIds: normalizedWordIds,
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

// normalizeWordIds keeps the current selection aligned with settings.
function normalizeWordIds({
  goal,
  sourceWordIds,
  vocabulary,
}: {
  // goal is the configured number of Story Words to propose.
  readonly goal: number;
  // sourceWordIds are current or daily word ids before normalization.
  readonly sourceWordIds: readonly string[];
  // vocabulary provides deterministic fill candidates.
  readonly vocabulary: readonly VocabularyItem[];
}): readonly string[] {
  const selected = unique(sourceWordIds).slice(0, goal);
  const selectedSet = new Set(selected);

  for (const word of vocabulary) {
    if (selected.length >= goal) {
      break;
    }

    if (!selectedSet.has(word.id)) {
      selected.push(word.id);
      selectedSet.add(word.id);
    }
  }

  return selected;
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

// unique removes duplicate ids while preserving local selection order.
function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

// toDateKey creates the local Today's Words id for a calendar day.
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
