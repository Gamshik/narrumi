import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// CollapsingTitleEdgeEffectStyles positions a compact title above shared screen material.
type CollapsingTitleEdgeEffectStyles = {
  // fill expands the non-interactive title overlay across the screen.
  readonly fill: ViewStyle;
  // compactTitleContainer centers the collapsed title above shared top material.
  readonly compactTitleContainer: ViewStyle;
  // compactTitle keeps collapsed section names restrained and readable.
  readonly compactTitle: TextStyle;
};

// collapsingTitleEdgeEffectStyles excludes reusable blur and gradient construction.
export const collapsingTitleEdgeEffectStyles: CollapsingTitleEdgeEffectStyles =
  StyleSheet.create({
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
