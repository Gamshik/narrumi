import {
  createBrowseVocabulary,
  createChooseEpisodeStoryWord,
  createCreateSeries,
  createDeleteEpisode,
  createDeleteSeries,
  createGenerateEpisode,
  createLoadLearningPreferences,
  createLoadEpisodeReader,
  createLoadLearningSignals,
  createLoadSeriesDetails,
  createListSeries,
  createManageAuthSession,
  createRecordLearningSignal,
  createReplaceEpisodeStoryWord,
  createShuffleEpisodeStoryWords,
  createStartOrResumeEpisodeWordSelection,
  createStartOrResumeTodaysWordSet,
  createSubmitEpisodeInteraction,
  createSyncLocalChanges,
  type SyncLocalChanges,
  createUpdateLearningPreferences,
  createUpdateWordSet,
} from '@application/index';
import type {
  AuthGateway,
  AuthSessionProvider,
  EpisodeGenerationGateway,
  InteractionGateway,
  RemoteSeriesStore,
} from '@application/ports';
import {
  AsyncStorageSyncQueue,
  AsyncStorageLocalSeriesStore,
  BundledOxfordVocabularyCatalog,
  createSupabaseClient,
  ExpoSpeechAudioNarrator,
  ExpoNetworkStatus,
  QueuedLocalSeriesStore,
  SupabaseAuthSessionProvider,
  SupabaseEpisodeGenerationGateway,
  SupabaseInteractionGateway,
  SupabaseRemoteSeriesStore,
  SystemClock,
} from '@infrastructure/index';

// rawLocalSeriesStore applies remote state without creating recursive queue entries.
const rawLocalSeriesStore = new AsyncStorageLocalSeriesStore();
// syncQueue persists compact operation pointers after local-first writes.
const syncQueue = new AsyncStorageSyncQueue();
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
// audioNarrator speaks episode sentences through the Expo-managed TTS boundary.
const audioNarrator = new ExpoSpeechAudioNarrator();
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
const createSeries = createCreateSeries(localSeriesStore, systemClock);
const deleteEpisode = createDeleteEpisode(localSeriesStore, systemClock);
const deleteSeries = createDeleteSeries(localSeriesStore, systemClock);
const listSeries = createListSeries(localSeriesStore);
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
);
const submitEpisodeInteraction = createSubmitEpisodeInteraction(
  localSeriesStore,
  vocabularyCatalog,
  networkStatus,
  supabaseServices.interactionGateway,
  systemClock,
);
const updateLearningPreferences = createUpdateLearningPreferences(
  localSeriesStore,
  systemClock,
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
  listSeries: withPreSync(listSeries, syncLocalChanges),
  loadLearningPreferences: withPreSync(
    loadLearningPreferences,
    syncLocalChanges,
  ),
  loadLearningSignals,
  loadEpisodeReader,
  loadSeriesDetails,
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
  audioNarrator,
  startTodaysWordSet: withBackgroundSync(
    startTodaysWordSet,
    syncLocalChanges,
  ),
  startEpisodeWordSelection: withBackgroundSync(
    startEpisodeWordSelection,
    syncLocalChanges,
  ),
  generateEpisode: withBackgroundSync(
    generateEpisode,
    syncLocalChanges,
  ),
  submitEpisodeInteraction: withBackgroundSync(
    submitEpisodeInteraction,
    syncLocalChanges,
  ),
  syncLocalChanges,
  updateLearningPreferences: withBackgroundSync(
    updateLearningPreferences,
    syncLocalChanges,
  ),
  updateWordSet: withBackgroundSync(updateWordSet, syncLocalChanges),
} as const;

// SupabaseServices groups optional adapters sharing one configured client.
type SupabaseServices = {
  // authGateway creates and observes authenticated mobile sessions.
  readonly authGateway: AuthGateway;
  // episodeGenerationGateway calls generate-episode or reports missing config.
  readonly episodeGenerationGateway: EpisodeGenerationGateway;
  // interactionGateway calls submit-interaction or reports missing config.
  readonly interactionGateway: InteractionGateway;
  // authSessionProvider exposes the active user without Supabase types.
  readonly authSessionProvider: AuthSessionProvider;
  // remoteSeriesStore persists the authenticated cloud copy behind RLS.
  readonly remoteSeriesStore: RemoteSeriesStore;
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
      interactionGateway: new SupabaseInteractionGateway(supabaseClient),
      authSessionProvider: new SupabaseAuthSessionProvider(supabaseClient),
      remoteSeriesStore: new SupabaseRemoteSeriesStore(supabaseClient),
    };
  } catch {
    return {
      authGateway: unavailableAuthGateway,
      episodeGenerationGateway: unavailableEpisodeGenerationGateway,
      interactionGateway: unavailableInteractionGateway,
      authSessionProvider: unauthenticatedSessionProvider,
      remoteSeriesStore: unavailableRemoteSeriesStore,
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
