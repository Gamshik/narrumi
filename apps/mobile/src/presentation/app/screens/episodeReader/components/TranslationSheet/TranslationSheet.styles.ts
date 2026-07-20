import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import {
  fontFamilies,
  radii,
  type AppColors,
} from '@presentation/theme';

// TranslationSheetStyles keeps the four Story Word details visually distinct and compact.
export type TranslationSheetStyles = {
  // content spaces the identity and translation blocks inside the sliding card.
  readonly content: ViewStyle;
  // identity groups the headword with its pronunciation.
  readonly identity: ViewStyle;
  // identityRow keeps the headword readable beside the grammatical badge.
  readonly identityRow: ViewStyle;
  // overlay keeps Story Word details above any native reader controls.
  readonly overlay: ViewStyle;
  // partOfSpeechBadge gives grammatical metadata a quiet Sorbet capsule.
  readonly partOfSpeechBadge: ViewStyle;
  // partOfSpeechText styles the grammatical category without competing with the word.
  readonly partOfSpeechText: TextStyle;
  // transcription uses the shared pronunciation accent color.
  readonly transcription: TextStyle;
  // translationSurface separates the context meaning from dictionary identity.
  readonly translationSurface: ViewStyle;
  // translationText gives the episode-specific Russian meaning clear emphasis.
  readonly translationText: TextStyle;
  // word is the strongest typographic element in the card.
  readonly word: TextStyle;
};

// createTranslationSheetStyles resolves all Story Word colors from the active theme.
export function createTranslationSheetStyles(
  colors: AppColors,
): TranslationSheetStyles {
  return StyleSheet.create<TranslationSheetStyles>({
    content: {
      gap: 18,
    },
    identity: {
      flex: 1,
      gap: 4,
    },
    identityRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 14,
      justifyContent: 'space-between',
    },
    overlay: {
      elevation: 110,
      zIndex: 110,
    },
    partOfSpeechBadge: {
      backgroundColor: colors.badgeAccentSurface,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      borderWidth: 1,
      marginTop: 3,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    partOfSpeechText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 12,
      lineHeight: 16,
    },
    transcription: {
      color: colors.systemOrange,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 15,
      lineHeight: 21,
    },
    translationSurface: {
      backgroundColor: colors.badgeAccentSurface,
      borderColor: colors.pillBorder,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: 17,
      paddingVertical: 15,
    },
    translationText: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 21,
      lineHeight: 29,
    },
    word: {
      color: colors.labelPrimary,
      flexShrink: 1,
      fontFamily: fontFamilies.displayHeavy,
      fontSize: 30,
      lineHeight: 36,
    },
  });
}
