import {
  createBrowseVocabulary,
  createLoadLearningPreferences,
  createLoadLearningSignals,
  createRecordLearningSignal,
  createStartOrResumeTodaysWordSet,
  createUpdateLearningPreferences,
  createUpdateWordSet,
} from '@application/index';
import {
  AsyncStorageLocalSeriesStore,
  BundledOxfordVocabularyCatalog,
  LocalOnlyNetworkStatus,
  SystemClock,
} from '@infrastructure/index';

// localSeriesStore is the single app-local adapter for offline series records.
const localSeriesStore = new AsyncStorageLocalSeriesStore();
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
    localSeriesStore,
    systemClock,
  ),
  loadLearningSignals: createLoadLearningSignals(localSeriesStore),
  recordLearningSignal: createRecordLearningSignal(
    localSeriesStore,
    systemClock,
  ),
  networkStatus,
  startTodaysWordSet: createStartOrResumeTodaysWordSet(
    localSeriesStore,
    vocabularyCatalog,
    systemClock,
  ),
  updateLearningPreferences: createUpdateLearningPreferences(
    localSeriesStore,
    systemClock,
  ),
  updateWordSet: createUpdateWordSet(localSeriesStore, systemClock),
} as const;
