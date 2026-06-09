import type {
  Episode,
  LearningPreferences,
  LearningSignal,
  Series,
  SeriesMemory,
  SyncMetadata,
  WordSet,
} from '@domain/index';

// LocalSeriesStore is the application port for immediate offline series writes.
export type LocalSeriesStore = {
  // getPreferences reads local series defaults or returns undefined before setup.
  readonly getPreferences: () => Promise<LearningPreferences | undefined>;
  // savePreferences persists local generation defaults before any future remote sync.
  readonly savePreferences: (preferences: LearningPreferences) => Promise<void>;
  // listSeries returns every validated personal series stored locally.
  readonly listSeries: () => Promise<readonly Series[]>;
  // getSeries reads one local series by id when present.
  readonly getSeries: (seriesId: string) => Promise<Series | undefined>;
  // saveSeries persists one local-first series immediately.
  readonly saveSeries: (series: Series) => Promise<void>;
  // deleteSeries removes one story root and all locally scoped child records.
  readonly deleteSeries: (seriesId: string, deletedAt: string) => Promise<void>;
  // listEpisodes returns validated local episodes for one series.
  readonly listEpisodes: (seriesId: string) => Promise<readonly Episode[]>;
  // getEpisode reads one local episode by id when present.
  readonly getEpisode: (episodeId: string) => Promise<Episode | undefined>;
  // saveEpisode persists one generated episode before any remote sync.
  readonly saveEpisode: (episode: Episode) => Promise<void>;
  // deleteEpisode removes one local episode and its episode-scoped learning data.
  readonly deleteEpisode: (episodeId: string, deletedAt: string) => Promise<void>;
  // getSeriesMemory reads the compact memory for one series when present.
  readonly getSeriesMemory: (
    seriesId: string,
  ) => Promise<SeriesMemory | undefined>;
  // saveSeriesMemory persists bounded continuity context locally.
  readonly saveSeriesMemory: (memory: SeriesMemory) => Promise<void>;
  // listWordSets returns stored word groups, optionally scoped by series or episode.
  readonly listWordSets: (
    filter?: LocalWordSetFilter,
  ) => Promise<readonly WordSet[]>;
  // saveWordSet persists Story Words, series words, weak words, or no-focus records.
  readonly saveWordSet: (wordSet: WordSet) => Promise<void>;
  // listLearningSignals returns internal vocabulary events, optionally scoped by word or story.
  readonly listLearningSignals: (
    filter?: LocalLearningSignalFilter,
  ) => Promise<readonly LearningSignal[]>;
  // saveLearningSignal persists one non-punitive local vocabulary event.
  readonly saveLearningSignal: (signal: LearningSignal) => Promise<void>;
  // getSyncMetadata reads one stored sync metadata record by target id.
  readonly getSyncMetadata: (
    recordId: string,
  ) => Promise<SyncMetadata | undefined>;
  // saveSyncMetadata persists record-level sync metadata for future reconciliation.
  readonly saveSyncMetadata: (
    recordId: string,
    metadata: SyncMetadata,
  ) => Promise<void>;
};

// LocalWordSetFilter narrows word-set reads without exposing AsyncStorage keys.
export type LocalWordSetFilter = {
  // seriesId scopes word sets to one personal series.
  readonly seriesId?: string;
  // episodeId scopes word sets to one generated episode.
  readonly episodeId?: string;
  // dateKey scopes Today's Words to one local YYYY-MM-DD date.
  readonly dateKey?: string;
};

// LocalLearningSignalFilter narrows signal reads for Word Picker scoring.
export type LocalLearningSignalFilter = {
  // wordId scopes signals to one bundled Oxford word.
  readonly wordId?: string;
  // seriesId scopes signals to one personal series.
  readonly seriesId?: string;
  // episodeId scopes signals to one generated episode.
  readonly episodeId?: string;
};
