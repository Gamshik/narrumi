import type { ReactElement } from 'react';
import { Image, View } from 'react-native';

import { createSeriesCardImages } from '../../CreateSeriesFlow.assets';
import {
  seriesSetupSteps,
  type SeriesSetupStep,
} from '../../seriesSetupFlow';
import { seriesSetupCardImageStyles } from './SeriesSetupCardImage.styles';

// SeriesSetupCardImageProps selects one bundled illustration for the focused card.
type SeriesSetupCardImageProps = {
  // step identifies the visual hint whose embedded labels match the current task.
  readonly step: SeriesSetupStep;
};

// SeriesSetupCardImage renders a decorative visual hint without duplicating its labels for screen readers.
export function SeriesSetupCardImage({
  step,
}: SeriesSetupCardImageProps): ReactElement {
  return (
    <View style={seriesSetupCardImageStyles.container}>
      {seriesSetupSteps.map((imageStep: SeriesSetupStep): ReactElement => (
        <Image
          accessibilityIgnoresInvertColors
          accessible={false}
          fadeDuration={0}
          key={imageStep}
          resizeMethod="resize"
          resizeMode="contain"
          source={createSeriesCardImages[imageStep]}
          style={[
            seriesSetupCardImageStyles.image,
            imageStep === step
              ? seriesSetupCardImageStyles.activeImage
              : seriesSetupCardImageStyles.inactiveImage,
          ]}
        />
      ))}
    </View>
  );
}
