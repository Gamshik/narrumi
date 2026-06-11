import type {
  Clock,
  LocalSeriesStore,
  SeriesSetupModerationGateway,
} from '@application/ports';
import type {
  CefrLevel,
  LearningGenre,
  Series,
  SeriesMemory,
  SeriesParticipationMode,
  SyncMetadata,
} from '@domain/index';

// UpdateSeriesSetupInput contains the editable fields allowed before first episode.
export type UpdateSeriesSetupInput = {
  // seriesId identifies the local series whose setup is being edited.
  readonly seriesId: string;
  // title is the required visible series name.
  readonly title: string;
  // genre is the selected broad story category.
  readonly genre: LearningGenre;
  // cefrLevel controls grammar and vocabulary complexity.
  readonly cefrLevel: CefrLevel;
  // tone stores the selected story mood.
  readonly tone: string;
  // premise stores the bounded starting idea for the series.
  readonly premise: string;
  // participationMode decides whether answers direct events or roleplay the learner.
  readonly participationMode: SeriesParticipationMode;
  // mainCharacters names recurring people or roles for continuity.
  readonly mainCharacters: readonly string[];
  // userRole records who the learner is in the story for character mode.
  readonly userRole?: string;
};

// UpdateSeriesSetupResult returns the saved local series after setup editing.
export type UpdateSeriesSetupResult = {
  // series is the updated local authoritative story root.
  readonly series: Series;
};

// UpdateSeriesSetup updates a series only while it has no generated episodes.
export type UpdateSeriesSetup = {
  // execute validates setup, enforces the first-episode lock, and writes locally.
  readonly execute: (
    input: UpdateSeriesSetupInput,
  ) => Promise<UpdateSeriesSetupResult>;
};

// createUpdateSeriesSetup injects local persistence and moderation boundaries.
export function createUpdateSeriesSetup(
  store: LocalSeriesStore,
  clock: Clock,
  seriesSetupModerationGateway?: SeriesSetupModerationGateway,
): UpdateSeriesSetup {
  return {
    execute: async (input) => {
      const [series, memory, episodes] = await Promise.all([
        store.getSeries(input.seriesId),
        store.getSeriesMemory(input.seriesId),
        store.listEpisodes(input.seriesId),
      ]);

      if (!series || !memory) {
        throw new Error('Series setup is required before editing.');
      }

      if (episodes.length > 0) {
        throw new Error('Series setup is read-only after the first episode.');
      }

      const normalized = normalizeSetupInput(input);

      await seriesSetupModerationGateway?.validateSeriesSetup({
        title: normalized.title,
        tone: normalized.tone,
        premise: normalized.premise,
        participationMode: normalized.participationMode,
        mainCharacters: normalized.mainCharacters,
        ...(normalized.userRole ? { userRole: normalized.userRole } : {}),
      });

      const timestamp = clock.now().toISOString();
      const sync = createDirtySync(timestamp, series.id);
      const { userRole: _previousMemoryRole, ...memoryWithoutRole } = memory;
      const { userRole: _previousSeriesRole, ...seriesWithoutRole } = series;
      const updatedMemory: SeriesMemory = {
        ...memoryWithoutRole,
        premise: normalized.premise,
        genre: normalized.genre,
        tone: normalized.tone,
        participationMode: normalized.participationMode,
        mainCharacters: normalized.mainCharacters,
        ...(normalized.userRole ? { userRole: normalized.userRole } : {}),
        currentConflict: 'The opening episode has not been generated yet.',
        knownFacts: [],
        openQuestions: ['What should happen in the first episode?'],
        importantObjectsOrLocations: [],
        recurringStoryWordIds: [],
        updatedAt: timestamp,
        sync,
      };
      const updatedSeries: Series = {
        ...seriesWithoutRole,
        title: normalized.title,
        genre: normalized.genre,
        cefrLevel: normalized.cefrLevel,
        tone: normalized.tone,
        premise: normalized.premise,
        participationMode: normalized.participationMode,
        mainCharacters: normalized.mainCharacters,
        ...(normalized.userRole ? { userRole: normalized.userRole } : {}),
        memory: updatedMemory,
        updatedAt: timestamp,
        sync,
      };

      await store.saveSeries(updatedSeries);
      await store.saveSeriesMemory(updatedMemory);

      return { series: updatedSeries };
    },
  };
}

// normalizeSetupInput enforces complete setup text before persistence.
function normalizeSetupInput(input: UpdateSeriesSetupInput): RequiredSetup {
  const title = requireText(input.title, 'Series title');
  const tone = requireText(input.tone, 'Series tone');
  const premise = requireText(input.premise, 'Series premise');
  const mainCharacters = input.mainCharacters
    .map((character) => character.trim())
    .filter((character) => character.length > 0);
  const userRole = input.userRole?.trim();

  if (mainCharacters.length === 0) {
    throw new Error('Main characters are required.');
  }

  if (input.participationMode === 'character' && !userRole) {
    throw new Error('Your role is required for character mode.');
  }

  return {
    title,
    genre: input.genre,
    cefrLevel: input.cefrLevel,
    tone,
    premise,
    participationMode: input.participationMode,
    mainCharacters,
    ...(userRole ? { userRole } : {}),
  };
}

// RequiredSetup is the normalized complete setup contract written locally.
type RequiredSetup = Omit<UpdateSeriesSetupInput, 'seriesId'>;

// createDirtySync creates pending metadata for future Supabase reconciliation.
function createDirtySync(timestamp: string, recordId: string): SyncMetadata {
  return {
    isDirty: true,
    pendingOperationId: `${timestamp}:${recordId}:setup-update`,
  };
}

// requireText protects local storage from empty required series fields.
function requireText(value: string, label: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}
