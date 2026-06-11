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

// CreateSeriesInput contains the full local-first series setup form.
export type CreateSeriesInput = {
  // title is the user-facing name of the personal series.
  readonly title: string;
  // genre is the approved broad story category used by future generation.
  readonly genre: LearningGenre;
  // cefrLevel controls future story grammar and vocabulary complexity.
  readonly cefrLevel: CefrLevel;
  // tone stores the intended mood of the story.
  readonly tone: string;
  // premise stores the bounded starting idea for the series.
  readonly premise: string;
  // participationMode decides whether answers direct events or roleplay the learner.
  readonly participationMode: SeriesParticipationMode;
  // mainCharacters names recurring people or roles for continuity.
  readonly mainCharacters: readonly string[];
  // userRole records who the learner is in the story when provided.
  readonly userRole?: string;
};

// CreateSeriesResult returns the persisted local series aggregate.
export type CreateSeriesResult = {
  // series is the local authoritative record after AsyncStorage persistence.
  readonly series: Series;
};

// CreateSeries creates a personal story container before remote sync exists.
export type CreateSeries = {
  // execute validates form text and writes series plus compact memory locally.
  readonly execute: (input: CreateSeriesInput) => Promise<CreateSeriesResult>;
};

// createCreateSeries injects local storage and time without exposing adapters to UI.
export function createCreateSeries(
  store: LocalSeriesStore,
  clock: Clock,
  seriesSetupModerationGateway?: SeriesSetupModerationGateway,
): CreateSeries {
  return {
    execute: async (input) => {
      const title = requireText(input.title, 'Series title');
      const tone = requireText(input.tone, 'Series tone');
      const premise = requireText(input.premise, 'Series premise');
      const mainCharacters = input.mainCharacters
        .map((character) => character.trim())
        .filter((character) => character.length > 0);
      const userRole = input.userRole?.trim();
      const participationMode = input.participationMode;

      if (participationMode === 'character' && !userRole) {
        throw new Error('Your role is required for character mode.');
      }

      if (mainCharacters.length === 0) {
        throw new Error('Main characters are required.');
      }

      await seriesSetupModerationGateway?.validateSeriesSetup({
        title,
        tone,
        premise,
        participationMode,
        mainCharacters,
        ...(userRole ? { userRole } : {}),
      });

      const timestamp = clock.now().toISOString();
      const seriesId = `series:${Date.parse(timestamp)}`;
      const sync = createDirtySync(timestamp, seriesId);
      const memory: SeriesMemory = {
        id: seriesId,
        seriesId,
        premise,
        genre: input.genre,
        tone,
        participationMode,
        mainCharacters,
        ...(userRole ? { userRole } : {}),
        currentConflict: 'The opening episode has not been generated yet.',
        knownFacts: [],
        openQuestions: ['What should happen in the first episode?'],
        importantObjectsOrLocations: [],
        unresolvedCliffhanger: `The story of ${title} is ready to begin.`,
        recurringStoryWordIds: [],
        updatedAt: timestamp,
        sync,
      };
      const series: Series = {
        id: seriesId,
        title,
        genre: input.genre,
        cefrLevel: input.cefrLevel,
        tone,
        premise,
        participationMode,
        mainCharacters,
        ...(userRole ? { userRole } : {}),
        memory,
        createdAt: timestamp,
        updatedAt: timestamp,
        sync,
      };

      await store.saveSeries(series);
      await store.saveSeriesMemory(memory);

      return { series };
    },
  };
}

// createDirtySync creates pending metadata for future Supabase reconciliation.
function createDirtySync(timestamp: string, recordId: string): SyncMetadata {
  return {
    isDirty: true,
    pendingOperationId: `${timestamp}:${recordId}:create`,
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
