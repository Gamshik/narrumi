import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// HomeEdgeEffectStyles contains only Home-specific compact-title positioning.
type HomeEdgeEffectStyles = {
  // fill expands the Home title overlay across the shared edge material.
  readonly fill: ViewStyle;
  // compactTitleContainer centers the collapsed title above the reusable top material.
  readonly compactTitleContainer: ViewStyle;
  // compactTitle keeps the collapsed Home section name restrained and readable.
  readonly compactTitle: TextStyle;
};

// homeEdgeEffectStyles deliberately excludes reusable blur and gradient construction.
export const homeEdgeEffectStyles: HomeEdgeEffectStyles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compactTitleContainer: {
    position: 'absolute',
    left: 64,
    right: 64,
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.25,
    textAlign: 'center',
  },
});
