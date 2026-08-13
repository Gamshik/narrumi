import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// DailySessionEdgeEffectStyles positions the fixed setup navigation icon above shared material.
type DailySessionEdgeEffectStyles = {
  // fill expands the interactive overlay without blocking the scroll surface.
  readonly fill: ViewStyle;
  // exitButton positions the shared navigation target inside top glass.
  readonly exitButton: ViewStyle;
  // compactTitleContainer centers the collapsed title without intercepting navigation presses.
  readonly compactTitleContainer: ViewStyle;
  // compactTitle matches the centered create-series modal heading.
  readonly compactTitle: TextStyle;
};

// dailySessionEdgeEffectStyles separates setup-specific navigation from reusable edge construction.
export const dailySessionEdgeEffectStyles: DailySessionEdgeEffectStyles =
  StyleSheet.create({
    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    exitButton: {
      position: 'absolute',
      left: 20,
    },
    compactTitleContainer: {
      position: 'absolute',
      left: 72,
      right: 72,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactTitle: {
      fontSize: 20,
      lineHeight: 25,
      letterSpacing: -0.25,
      textAlign: 'center',
    },
  });
