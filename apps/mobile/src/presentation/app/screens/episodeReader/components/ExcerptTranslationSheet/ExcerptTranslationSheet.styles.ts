import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii } from '@presentation/theme';

// ExcerptTranslationSheetStyles keeps source-to-result hierarchy independent from Reader globals.
type ExcerptTranslationSheetStyles = {
  // connectorBadge is the compact directional bubble between both language blocks.
  readonly connectorBadge: ViewStyle;
  // connectorGlyph centers the language transition marker.
  readonly connectorGlyph: TextStyle;
  // connectorLine keeps the directional marker visually anchored.
  readonly connectorLine: ViewStyle;
  // connectorRow lays out the quiet source-to-result transition.
  readonly connectorRow: ViewStyle;
  // content spaces the complete translation mapping inside the sheet.
  readonly content: ViewStyle;
  // overlay keeps the modal result above the floating selection actions on both platforms.
  readonly overlay: ViewStyle;
  // section groups one language label with its text.
  readonly section: ViewStyle;
  // sectionLabel identifies source and target without competing with content.
  readonly sectionLabel: TextStyle;
  // sourceSurface preserves the selected excerpt as a distinct grape-soft input.
  readonly sourceSurface: ViewStyle;
  // sourceText presents the exact selection with comfortable reading metrics.
  readonly sourceText: TextStyle;
  // translationText gives the Russian result the strongest typographic emphasis.
  readonly translationText: TextStyle;
};

// excerptTranslationSheetStyles defines stable layout while colors remain theme-driven.
export const excerptTranslationSheetStyles: ExcerptTranslationSheetStyles =
  StyleSheet.create({
    connectorBadge: {
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      height: 30,
      justifyContent: 'center',
      width: 30,
    },
    connectorGlyph: {
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 15,
      lineHeight: 18,
    },
    connectorLine: {
      height: StyleSheet.hairlineWidth,
      maxWidth: 52,
      width: 42,
    },
    connectorRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      minHeight: 32,
    },
    content: {
      gap: 10,
    },
    overlay: {
      elevation: 100,
      zIndex: 100,
    },
    section: {
      gap: 7,
    },
    sectionLabel: {
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 10,
      letterSpacing: 1.15,
    },
    sourceSurface: {
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: 15,
      paddingVertical: 13,
    },
    sourceText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 16,
      lineHeight: 24,
    },
    translationText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 21,
      lineHeight: 30,
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
  });
