import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// DictionaryLevelFilterButtonStyles defines the fixed geometry of the compact search-row control.
type DictionaryLevelFilterButtonStyles = {
  // activeBadge places the current CEFR level above the filter glyph without widening the search row.
  readonly activeBadge: ViewStyle;
  // activeBadgeText keeps two-character CEFR labels legible inside the compact indicator.
  readonly activeBadgeText: TextStyle;
  // button is the circular glass hit target rendered inside the search field.
  readonly button: ViewStyle;
  // container reserves the complete touch target for JellyPressable animation.
  readonly container: ViewStyle;
};

// dictionaryLevelFilterButtonStyles keeps layout stable while colors remain theme-driven.
export const dictionaryLevelFilterButtonStyles: DictionaryLevelFilterButtonStyles =
  StyleSheet.create({
    container: {
      height: 40,
      width: 40,
    },
    button: {
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    activeBadge: {
      alignItems: 'center',
      borderRadius: 8,
      height: 16,
      justifyContent: 'center',
      minWidth: 20,
      paddingHorizontal: 3,
      position: 'absolute',
      right: -4,
      top: -3,
    },
    activeBadgeText: {
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: -0.2,
      lineHeight: 10,
    },
  });
