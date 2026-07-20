import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii, shadows } from '@presentation/theme';

// SelectionActionBarStyles separates stable action geometry from theme colors and motion.
type SelectionActionBarStyles = {
  // futureAction is one reserved square action surface.
  readonly futureAction: ViewStyle;
  // futureActionText styles the animated placeholder glyph.
  readonly futureActionText: TextStyle;
  // root positions the panel above the safe area without affecting Reader layout.
  readonly root: ViewStyle;
  // surface lays out all three action slots inside one bubble.
  readonly surface: ViewStyle;
  // translateButton is the dominant live action.
  readonly translateButton: ViewStyle;
  // translateGlyph styles the compact language-pair mark.
  readonly translateGlyph: TextStyle;
  // translateLabel styles the live action title.
  readonly translateLabel: TextStyle;
};

// selectionActionBarStyles define stable layout while theme colors stay dynamic.
export const selectionActionBarStyles: SelectionActionBarStyles =
  StyleSheet.create({
    root: {
      alignItems: 'center',
      left: 0,
      paddingHorizontal: 16,
      position: 'absolute',
      right: 0,
      zIndex: 80,
    },
    surface: {
      alignItems: 'center',
      borderRadius: radii.lg,
      flexDirection: 'row',
      gap: 6,
      padding: 6,
      ...shadows.soft,
    },
    translateButton: {
      alignItems: 'center',
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: 42,
      minWidth: 112,
      paddingHorizontal: 14,
    },
    translateGlyph: {
      color: '#ffffff',
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
    },
    translateLabel: {
      color: '#ffffff',
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 14,
    },
    futureAction: {
      alignItems: 'center',
      borderRadius: radii.md,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      opacity: 0.64,
      width: 42,
    },
    futureActionText: {
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 16,
    },
  });
