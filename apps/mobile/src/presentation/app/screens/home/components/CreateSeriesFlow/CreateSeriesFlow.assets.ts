import { Asset } from 'expo-asset';
import type { ImageRequireSource } from 'react-native';

import type { SeriesSetupStep } from './seriesSetupFlow';

// createSeriesCardImages binds each required card to its bundled visual hint.
export const createSeriesCardImages: Readonly<
  Record<SeriesSetupStep, ImageRequireSource>
> = {
  participation: require('../../../../../../../assets/create-series/role.png'),
  idea: require('../../../../../../../assets/create-series/idea.png'),
  characters: require('../../../../../../../assets/create-series/characters.png'),
  title: require('../../../../../../../assets/create-series/title.png'),
};

// createSeriesCardImageModules is the stable module list warmed before the modal opens.
const createSeriesCardImageModules: ImageRequireSource[] =
  Object.values(createSeriesCardImages);

// cardImagePreloadPromise shares one native asset-cache warmup across every modal opening.
let cardImagePreloadPromise: Promise<void> | undefined;

// preloadCreateSeriesCardImages prepares every card asset before users navigate between steps.
export function preloadCreateSeriesCardImages(): Promise<void> {
  if (!cardImagePreloadPromise) {
    cardImagePreloadPromise = Asset.loadAsync(createSeriesCardImageModules).then(
      (): void => undefined,
    );
  }

  return cardImagePreloadPromise;
}
