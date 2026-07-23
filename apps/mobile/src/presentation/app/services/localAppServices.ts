import {
  createBrowseVocabulary,
  createChooseEpisodeStoryWord,
  createCreateSeries,
  createDeleteEpisode,
  createDeleteSeries,
  createGenerateEpisode,
  createGenerateSeriesSetupDraft,
  createGetVocabularyItem,
  createHydrateBootstrapSession,
  createLoadLearningPreferences,
  createLoadEpisodeReader,
  createLoadLearningSignals,
  createLoadSeriesDetails,
  createListSeries,
  createLoadSeriesSetupDraft,
  createManageAuthSession,
  createDeleteSeriesSetupDraft,
  createRecordLearningSignal,
  createReplaceEpisodeStoryWord,
  createShuffleEpisodeStoryWords,
  createStartOrResumeEpisodeWordSelection,
  createStartOrResumeTodaysWordSet,
  createSubmitEpisodeInteraction,
  createTranslateEpisodeExcerpt,
  createSyncLocalChanges,
  type SyncLocalChanges,
  createUpdateLearningPreferences,
  createUpdateSeriesSetup,
  createSaveSeriesSetupDraft,
  createUpdateWordSet,
} from '@application/index';
import type {
  AuthGateway,
  AuthSessionProvider,
  EpisodeGenerationGateway,
  ExcerptTranslationGateway,
  InteractionGateway,
  RemoteSeriesStore,
  SeriesSetupDraftGateway,
  SeriesSetupModerationGateway,
} from '@application/ports';
import {
  AsyncStorageSyncQueue,
  AsyncStorageGenerationRequestStore,
  AsyncStorageLocalSeriesStore,
  BundledOxfordVocabularyCatalog,
  createSupabaseClient,
  ExpoNetworkStatus,
  QueuedLocalSeriesStore,
  SupabaseAuthSessionProvider,
  SupabaseEpisodeGenerationGateway,
  SupabaseExcerptTranslationGateway,
  SupabaseInteractionGateway,
  SupabaseRemoteSeriesStore,
  SupabaseSeriesSetupDraftGateway,
  SupabaseSeriesSetupModerationGateway,
  SystemClock,
} from '@infrastructure/index';

// rawLocalSeriesStore applies remote state without creating recursive queue entries.
const rawLocalSeriesStore = new AsyncStorageLocalSeriesStore();
// syncQueue persists compact operation pointers after local-first writes.
const syncQueue = new AsyncStorageSyncQueue();
// generationRequestStore preserves unfinished AI request ids for safe retries.
const generationRequestStore = new AsyncStorageGenerationRequestStore();
// localSeriesStore queues every successful domain-record write for later sync.
const localSeriesStore = new QueuedLocalSeriesStore(
  rawLocalSeriesStore,
  syncQueue,
);
// vocabularyCatalog is shared so the bundled Oxford seed is parsed once.
const vocabularyCatalog = new BundledOxfordVocabularyCatalog();
// systemClock provides production time to local-first use cases.
const systemClock = new SystemClock();
// networkStatus gates server-only features through real device connectivity.
const networkStatus = new ExpoNetworkStatus();
// supabaseServices owns optional AI, auth, and remote persistence adapters.
const supabaseServices = createSupabaseServices();
// syncLocalChanges keeps local mode functional when Supabase or auth is unavailable.
const syncLocalChanges = createSyncLocalChanges(
  rawLocalSeriesStore,
  supabaseServices.remoteSeriesStore,
  syncQueue,
  supabaseServices.authSessionProvider,
  networkStatus,
);

const browseVocabulary = createBrowseVocabulary(vocabularyCatalog);
const chooseEpisodeStoryWord = createChooseEpisodeStoryWord(
  localSeriesStore,
  vocabularyCatalog,
  systemClock,
);
const createSeries = createCreateSeries(
  localSeriesStore,
  systemClock,
  supabaseServices.seriesSetupModerationGateway,
);
const generateSeriesSetupDraft = createGenerateSeriesSetupDraft(
  networkStatus,
  supabaseServices.seriesSetupDraftGateway,
  systemClock,
  generationRequestStore,
);
// getVocabularyItem resolves one Story Word from the bundled offline dictionary.
const getVocabularyItem = createGetVocabularyItem(vocabularyCatalog);
const hydrateBootstrapSession = createHydrateBootstrapSession(
  localSeriesStore,
  systemClock,
);
const deleteEpisode = createDeleteEpisode(localSeriesStore, systemClock);
const deleteSeries = createDeleteSeries(localSeriesStore, systemClock);
const listSeries = createListSeries(localSeriesStore);
// loadSeriesSetupDraft restores an unfinished form without pre-sync or network access.
const loadSeriesSetupDraft = createLoadSeriesSetupDraft(localSeriesStore);
// saveSeriesSetupDraft persists incomplete form values without final validation.
const saveSeriesSetupDraft = createSaveSeriesSetupDraft(localSeriesStore);
// deleteSeriesSetupDraft clears a completed or discarded local form snapshot.
const deleteSeriesSetupDraft = createDeleteSeriesSetupDraft(localSeriesStore);
const loadLearningPreferences = createLoadLearningPreferences(
  localSeriesStore,
  systemClock,
);
const loadLearningSignals = createLoadLearningSignals(localSeriesStore);
const loadEpisodeReader = createLoadEpisodeReader(localSeriesStore);
const loadSeriesDetails = createLoadSeriesDetails(localSeriesStore);
const recordLearningSignal = createRecordLearningSignal(
  localSeriesStore,
  systemClock,
);
const replaceEpisodeStoryWord = createReplaceEpisodeStoryWord(
  localSeriesStore,
  vocabularyCatalog,
  systemClock,
);
const shuffleEpisodeStoryWords = createShuffleEpisodeStoryWords(
  localSeriesStore,
  vocabularyCatalog,
  systemClock,
);
const startTodaysWordSet = createStartOrResumeTodaysWordSet(
  localSeriesStore,
  vocabularyCatalog,
  systemClock,
);
const startEpisodeWordSelection = createStartOrResumeEpisodeWordSelection(
  localSeriesStore,
  vocabularyCatalog,
  systemClock,
);
const generateEpisode = createGenerateEpisode(
  localSeriesStore,
  vocabularyCatalog,
  networkStatus,
  supabaseServices.episodeGenerationGateway,
  systemClock,
  generationRequestStore,
);
const submitEpisodeInteraction = createSubmitEpisodeInteraction(
  localSeriesStore,
  vocabularyCatalog,
  networkStatus,
  supabaseServices.interactionGateway,
  systemClock,
);
// translateEpisodeExcerpt is online-only and does not mutate local episode state.
const translateEpisodeExcerpt = createTranslateEpisodeExcerpt(
  networkStatus,
  supabaseServices.excerptTranslationGateway,
);
const updateLearningPreferences = createUpdateLearningPreferences(
  localSeriesStore,
  systemClock,
);
const updateSeriesSetup = createUpdateSeriesSetup(
  localSeriesStore,
  systemClock,
  supabaseServices.seriesSetupModerationGateway,
);
const updateWordSet = createUpdateWordSet(localSeriesStore, systemClock);
const manageAuthSession = createManageAuthSession(
  supabaseServices.authGateway,
);

// localAppServices groups application use cases for the current local MVP.
export const localAppServices = {
  browseVocabulary,
  chooseEpisodeStoryWord: withBackgroundSync(
    chooseEpisodeStoryWord,
    syncLocalChanges,
  ),
  createSeries: withBackgroundSync(createSeries, syncLocalChanges),
  deleteEpisode: withBackgroundSync(deleteEpisode, syncLocalChanges),
  deleteSeries: withBackgroundSync(deleteSeries, syncLocalChanges),
  deleteSeriesSetupDraft,
  hydrateBootstrapSession,
  listSeries: withPreSync(listSeries, syncLocalChanges),
  loadLearningPreferences: withPreSync(
    loadLearningPreferences,
    syncLocalChanges,
  ),
  loadLearningSignals,
  loadEpisodeReader,
  loadSeriesDetails,
  loadSeriesSetupDraft,
  manageAuthSession,
  recordLearningSignal: withBackgroundSync(
    recordLearningSignal,
    syncLocalChanges,
  ),
  replaceEpisodeStoryWord: withBackgroundSync(
    replaceEpisodeStoryWord,
    syncLocalChanges,
  ),
  shuffleEpisodeStoryWords: withBackgroundSync(
    shuffleEpisodeStoryWords,
    syncLocalChanges,
  ),
  networkStatus,
  startTodaysWordSet: withBackgroundSync(
    startTodaysWordSet,
    syncLocalChanges,
  ),
  startEpisodeWordSelection: withBackgroundSync(
    startEpisodeWordSelection,
    syncLocalChanges,
  ),
  generateEpisode: withGenerationSync(generateEpisode, syncLocalChanges),
  generateSeriesSetupDraft,
  getVocabularyItem,
  submitEpisodeInteraction: withBackgroundSync(
    submitEpisodeInteraction,
    syncLocalChanges,
  ),
  translateEpisodeExcerpt,
  syncLocalChanges,
  saveSeriesSetupDraft,
  updateLearningPreferences: withBackgroundSync(
    updateLearningPreferences,
    syncLocalChanges,
  ),
  updateSeriesSetup: withBackgroundSync(updateSeriesSetup, syncLocalChanges),
  updateWordSet: withBackgroundSync(updateWordSet, syncLocalChanges),
} as const;

// SupabaseServices groups optional adapters sharing one configured client.
type SupabaseServices = {
  // authGateway creates and observes authenticated mobile sessions.
  readonly authGateway: AuthGateway;
  // episodeGenerationGateway calls generate-episode or reports missing config.
  readonly episodeGenerationGateway: EpisodeGenerationGateway;
  // excerptTranslationGateway translates selected reader prose through the AI boundary.
  readonly excerptTranslationGateway: ExcerptTranslationGateway;
  // interactionGateway calls submit-interaction or reports missing config.
  readonly interactionGateway: InteractionGateway;
  // seriesSetupModerationGateway validates setup fields before local series creation.
  readonly seriesSetupModerationGateway?: SeriesSetupModerationGateway;
  // authSessionProvider exposes the active user without Supabase types.
  readonly authSessionProvider: AuthSessionProvider;
  // remoteSeriesStore persists the authenticated cloud copy behind RLS.
  readonly remoteSeriesStore: RemoteSeriesStore;
  // seriesSetupDraftGateway fills missing setup fields through an Edge Function.
  readonly seriesSetupDraftGateway: SeriesSetupDraftGateway;
};

// createSupabaseServices keeps local use available without public environment config.
function createSupabaseServices(): SupabaseServices {
  try {
    const supabaseClient = createSupabaseClient();

    return {
      authGateway: new SupabaseAuthSessionProvider(supabaseClient),
      episodeGenerationGateway: new SupabaseEpisodeGenerationGateway(
        supabaseClient,
      ),
      excerptTranslationGateway: new SupabaseExcerptTranslationGateway(
        supabaseClient,
      ),
      interactionGateway: new SupabaseInteractionGateway(supabaseClient),
      seriesSetupModerationGateway: new SupabaseSeriesSetupModerationGateway(
        supabaseClient,
      ),
      authSessionProvider: new SupabaseAuthSessionProvider(supabaseClient),
      remoteSeriesStore: new SupabaseRemoteSeriesStore(supabaseClient),
      seriesSetupDraftGateway: new SupabaseSeriesSetupDraftGateway(
        supabaseClient,
      ),
    };
  } catch {
    return {
      authGateway: unavailableAuthGateway,
      episodeGenerationGateway: unavailableEpisodeGenerationGateway,
      excerptTranslationGateway: unavailableExcerptTranslationGateway,
      interactionGateway: unavailableInteractionGateway,
      authSessionProvider: unauthenticatedSessionProvider,
      remoteSeriesStore: unavailableRemoteSeriesStore,
      seriesSetupDraftGateway: unavailableSeriesSetupDraftGateway,
    };
  }
}

// Executable is the common async use-case shape wrapped by sync composition.
type Executable<TArguments extends readonly unknown[], TResult> = {
  // execute performs one application action with typed plain-data arguments.
  readonly execute: (...arguments_: TArguments) => Promise<TResult>;
};

// withBackgroundSync triggers best-effort replay only after local work succeeds.
function withBackgroundSync<TArguments extends readonly unknown[], TResult>(
  service: Executable<TArguments, TResult>,
  sync: SyncLocalChanges,
): Executable<TArguments, TResult> {
  return {
    execute: async (...arguments_) => {
      const result = await service.execute(...arguments_);

      void sync.execute().catch(() => undefined);

      return result;
    },
  };
}

// withGenerationSync publishes completion state before generation and the new episode after it.
function withGenerationSync<TArguments extends readonly unknown[], TResult>(
  service: Executable<TArguments, TResult>,
  sync: SyncLocalChanges,
): Executable<TArguments, TResult> {
  return {
    execute: async (...arguments_) => {
      const preGenerationSync = await sync.execute();

      if (preGenerationSync.status === 'failed') {
        throw new Error(
          preGenerationSync.errorMessage ??
            'The current episode must sync before generating the next one.',
        );
      }

      const result = await service.execute(...arguments_);

      void sync.execute().catch(() => undefined);

      return result;
    },
  };
}

// withPreSync refreshes clean local reads without making cloud access mandatory.
function withPreSync<TArguments extends readonly unknown[], TResult>(
  service: Executable<TArguments, TResult>,
  sync: SyncLocalChanges,
): Executable<TArguments, TResult> {
  return {
    execute: async (...arguments_) => {
      await sync.execute().catch(() => undefined);

      return service.execute(...arguments_);
    },
  };
}

// unavailableEpisodeGenerationGateway fails only server-backed generation actions.
const unavailableEpisodeGenerationGateway: EpisodeGenerationGateway = {
  generateEpisode: async () => {
    throw new Error('Supabase Edge Functions are not configured.');
  },
};

// unavailableInteractionGateway fails only server-backed interaction actions.
const unavailableInteractionGateway: InteractionGateway = {
  submitInteraction: async () => {
    throw new Error('Supabase Edge Functions are not configured.');
  },
};

// unavailableExcerptTranslationGateway fails only selected-text translation actions.
const unavailableExcerptTranslationGateway: ExcerptTranslationGateway = {
  translateExcerpt: async (): Promise<never> => {
    throw new Error('Supabase Edge Functions are not configured.');
  },
};

// unavailableSeriesSetupDraftGateway fails only server-backed setup generation.
const unavailableSeriesSetupDraftGateway: SeriesSetupDraftGateway = {
  generateSeriesSetupDraft: async () => {
    throw new Error('Supabase Edge Functions are not configured.');
  },
};

// unauthenticatedSessionProvider leaves the app in valid local-only mode.
const unauthenticatedSessionProvider: AuthSessionProvider = {
  getAuthenticatedUserId: async () => undefined,
};

// unavailableAuthGateway reports missing public configuration to account actions.
const unavailableAuthGateway: AuthGateway = {
  getSession: async () => undefined,
  signIn: async () => {
    throw new Error('Supabase authentication is not configured.');
  },
  signUp: async () => {
    throw new Error('Supabase authentication is not configured.');
  },
  signOut: async () => undefined,
  subscribe: () => ({ unsubscribe: () => undefined }),
};

// unavailableRemoteSeriesStore is unreachable while no authenticated session exists.
const unavailableRemoteSeriesStore: RemoteSeriesStore = {
  upsert: async () => {
    throw new Error('Supabase remote storage is not configured.');
  },
  delete: async () => {
    throw new Error('Supabase remote storage is not configured.');
  },
  loadSnapshot: async () => {
    throw new Error('Supabase remote storage is not configured.');
  },
};
