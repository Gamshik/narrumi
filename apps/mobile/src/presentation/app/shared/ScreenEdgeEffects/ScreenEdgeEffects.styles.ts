import { StyleSheet, type ViewStyle } from 'react-native';

// ScreenEdgeEffectStyles defines the reusable full-screen material layers.
type ScreenEdgeEffectStyles = {
  // fill expands the non-interactive effect layer across its positioned parent.
  readonly fill: ViewStyle;
  // topContainer clips blur and tint into the shared upper fade depth.
  readonly topContainer: ViewStyle;
  // topBlur anchors each progressive blur layer to the status edge.
  readonly topBlur: ViewStyle;
  // topMaterial groups blur and tint under one optional opacity animation.
  readonly topMaterial: ViewStyle;
  // bottomGradient anchors the gradient-only fade to the device edge.
  readonly bottomGradient: ViewStyle;
};

// screenEdgeEffectStyles keeps shared top and bottom effects visually identical across surfaces.
export const screenEdgeEffectStyles: ScreenEdgeEffectStyles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topMaterial: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
