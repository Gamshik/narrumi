import {
  createBrowseVocabulary,
  createLoadLearningPreferences,
  createLoadWordProgress,
  createMarkWordPracticeProgress,
  createStartOrResumeDailySession,
  createUpdateDailySession,
  createUpdateLearningPreferences,
} from '@application/index';
import {
  AsyncStorageLocalProgressStore,
  BundledOxfordVocabularyCatalog,
  LocalOnlyNetworkStatus,
  SystemClock,
} from '@infrastructure/index';

// localProgressStore is the single app-local adapter for AsyncStorage progress keys.
const localProgressStore = new AsyncStorageLocalProgressStore();
// vocabularyCatalog is shared so the bundled Oxford seed is parsed once.
const vocabularyCatalog = new BundledOxfordVocabularyCatalog();
// systemClock provides production time to local-first use cases.
const systemClock = new SystemClock();
// networkStatus gates server-only features until real connectivity/backend wiring exists.
const networkStatus = new LocalOnlyNetworkStatus();

// localAppServices groups application use cases for the current local MVP.
export const localAppServices = {
  browseVocabulary: createBrowseVocabulary(vocabularyCatalog),
  loadLearningPreferences: createLoadLearningPreferences(
    localProgressStore,
    systemClock,
  ),
  loadWordProgress: createLoadWordProgress(localProgressStore),
  markWordPracticeProgress: createMarkWordPracticeProgress(
    localProgressStore,
    systemClock,
  ),
  networkStatus,
  startDailySession: createStartOrResumeDailySession(
    localProgressStore,
    vocabularyCatalog,
    systemClock,
  ),
  updateDailySession: createUpdateDailySession(localProgressStore, systemClock),
  updateLearningPreferences: createUpdateLearningPreferences(
    localProgressStore,
    systemClock,
  ),
} as const;
