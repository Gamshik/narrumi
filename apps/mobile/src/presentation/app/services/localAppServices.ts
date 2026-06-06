import {
  createBrowseVocabulary,
  createCreateSeries,
  createGenerateEpisode,
  createLoadLearningPreferences,
  createLoadEpisodeReader,
  createLoadLearningSignals,
  createLoadSeriesDetails,
  createListSeries,
  createRecordLearningSignal,
  createReplaceEpisodeStoryWord,
  createStartOrResumeEpisodeWordSelection,
  createStartOrResumeTodaysWordSet,
  createSubmitEpisodeInteraction,
  createUpdateLearningPreferences,
  createUpdateWordSet,
} from '@application/index';
import type {
  EpisodeGenerationGateway,
  InteractionGateway,
} from '@application/ports';
import {
  AsyncStorageLocalSeriesStore,
  BundledOxfordVocabularyCatalog,
  createSupabaseClient,
  ExpoSpeechAudioNarrator,
  ExpoNetworkStatus,
  SupabaseEpisodeGenerationGateway,
  SupabaseInteractionGateway,
  SystemClock,
} from '@infrastructure/index';

// localSeriesStore is the single app-local adapter for offline series records.
const localSeriesStore = new AsyncStorageLocalSeriesStore();
// vocabularyCatalog is shared so the bundled Oxford seed is parsed once.
const vocabularyCatalog = new BundledOxfordVocabularyCatalog();
// systemClock provides production time to local-first use cases.
const systemClock = new SystemClock();
// networkStatus gates server-only features through real device connectivity.
const networkStatus = new ExpoNetworkStatus();
// audioNarrator speaks episode sentences through the Expo-managed TTS boundary.
const audioNarrator = new ExpoSpeechAudioNarrator();
// aiGateways invoke Supabase Edge Functions when public environment is configured.
const aiGateways = createAiGateways();

// localAppServices groups application use cases for the current local MVP.
export const localAppServices = {
  browseVocabulary: createBrowseVocabulary(vocabularyCatalog),
  createSeries: createCreateSeries(localSeriesStore, systemClock),
  listSeries: createListSeries(localSeriesStore),
  loadLearningPreferences: createLoadLearningPreferences(
    localSeriesStore,
    systemClock,
  ),
  loadLearningSignals: createLoadLearningSignals(localSeriesStore),
  loadEpisodeReader: createLoadEpisodeReader(localSeriesStore),
  loadSeriesDetails: createLoadSeriesDetails(localSeriesStore),
  recordLearningSignal: createRecordLearningSignal(
    localSeriesStore,
    systemClock,
  ),
  replaceEpisodeStoryWord: createReplaceEpisodeStoryWord(
    localSeriesStore,
    vocabularyCatalog,
    systemClock,
  ),
  networkStatus,
  audioNarrator,
  startTodaysWordSet: createStartOrResumeTodaysWordSet(
    localSeriesStore,
    vocabularyCatalog,
    systemClock,
  ),
  startEpisodeWordSelection: createStartOrResumeEpisodeWordSelection(
    localSeriesStore,
    vocabularyCatalog,
    systemClock,
  ),
  generateEpisode: createGenerateEpisode(
    localSeriesStore,
    vocabularyCatalog,
    networkStatus,
    aiGateways.episodeGenerationGateway,
    systemClock,
  ),
  submitEpisodeInteraction: createSubmitEpisodeInteraction(
    localSeriesStore,
    networkStatus,
    aiGateways.interactionGateway,
    systemClock,
  ),
  updateLearningPreferences: createUpdateLearningPreferences(
    localSeriesStore,
    systemClock,
  ),
  updateWordSet: createUpdateWordSet(localSeriesStore, systemClock),
} as const;

// AiGateways groups the two production AI boundary adapters.
type AiGateways = {
  // episodeGenerationGateway calls generate-episode or reports missing config.
  readonly episodeGenerationGateway: EpisodeGenerationGateway;
  // interactionGateway calls submit-interaction or reports missing config.
  readonly interactionGateway: InteractionGateway;
};

// createAiGateways keeps local reading available when Supabase env is not configured.
function createAiGateways(): AiGateways {
  try {
    const supabaseClient = createSupabaseClient();

    return {
      episodeGenerationGateway: new SupabaseEpisodeGenerationGateway(
        supabaseClient,
      ),
      interactionGateway: new SupabaseInteractionGateway(supabaseClient),
    };
  } catch {
    return {
      episodeGenerationGateway: unavailableEpisodeGenerationGateway,
      interactionGateway: unavailableInteractionGateway,
    };
  }
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
