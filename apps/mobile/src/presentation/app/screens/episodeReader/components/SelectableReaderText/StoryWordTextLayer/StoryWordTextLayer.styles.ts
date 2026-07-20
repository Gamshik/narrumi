import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// StoryWordTextLayerStyles separates invisible measurement and interaction geometry.
type StoryWordTextLayerStyles = {
  // hitLayer covers the text block while letting all non-Story-Word touches pass through.
  readonly hitLayer: ViewStyle;
  // hitTarget captures only the measured Story Word rectangle.
  readonly hitTarget: ViewStyle;
  // measurementText measures intrinsic text widths without becoming visible or interactive.
  readonly measurementText: TextStyle;
  // segmentLayer gives each absolute target the full text block as its hit-test parent.
  readonly segmentLayer: ViewStyle;
};

// storyWordTextLayerStyles keep exact targets above selection without changing text layout.
export const storyWordTextLayerStyles: StoryWordTextLayerStyles =
  StyleSheet.create({
    hitLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 2,
    },
    hitTarget: {
      position: 'absolute',
    },
    measurementText: {
      left: 0,
      opacity: 0,
      position: 'absolute',
      top: 0,
    },
    segmentLayer: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
  });
