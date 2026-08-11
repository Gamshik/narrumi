import {
  StyleSheet,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

// SeriesSetupCardImageStyles defines the single image-only style contract.
type SeriesSetupCardImageStyles = {
  // container keeps the image stack in one stable card-layout slot.
  readonly container: ViewStyle;
  // image overlays every fixed source so navigation changes only opacity.
  readonly image: ImageStyle;
  // activeImage reveals the illustration for the focused card.
  readonly activeImage: ImageStyle;
  // inactiveImage keeps other decoded illustrations mounted but invisible.
  readonly inactiveImage: ImageStyle;
};

// seriesSetupCardImageStyles bounds every generated illustration to the same compact card slot.
export const seriesSetupCardImageStyles: SeriesSetupCardImageStyles =
  StyleSheet.create<SeriesSetupCardImageStyles>({
    container: {
      width: '100%',
      height: 170,
      marginBottom: 12,
      overflow: 'visible',
    },
    image: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: '100%',
      height: '100%',
      transform: [{ scale: 1.24 }],
    },
    activeImage: {
      opacity: 1,
    },
    inactiveImage: {
      opacity: 0,
    },
  });
