import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii, shadows } from '@presentation/theme';

// DictionaryPickerPanelStyles defines the stable layout roles owned by the picker.
type DictionaryPickerPanelStyles = {
  // header aligns picker context with its close action.
  readonly header: ViewStyle;
  // targetWord emphasizes the Story Word being replaced.
  readonly targetWord: TextStyle;
  // targetWordPill groups the current headword with its Russian meaning.
  readonly targetWordPill: ViewStyle;
  // targetWordTranslation keeps replacement context visually secondary.
  readonly targetWordTranslation: TextStyle;
  // resultSummary reserves stable space for loading and search feedback.
  readonly resultSummary: TextStyle;
  // listViewport bounds results so the parent setup screen does not expand.
  readonly listViewport: ViewStyle;
  // listMaterial adds a soft lit layer beneath the independently moving rows.
  readonly listMaterial: ViewStyle;
  // listScroll keeps the native-driven results inside the fixed viewport.
  readonly listScroll: ViewStyle;
  // listContent spaces the dictionary rows inside the nested scroll area.
  readonly listContent: ViewStyle;
  // wordRow defines one compact dictionary result surface.
  readonly wordRow: ViewStyle;
  // wordRowPressed removes elevation so the full row appears pushed inward.
  readonly wordRowPressed: ViewStyle;
  // wordRowGradient gives results the same top-lit material as Dictionary.
  readonly wordRowGradient: ViewStyle;
  // wordLevelRail mirrors Dictionary's compact CEFR scanning accent.
  readonly wordLevelRail: ViewStyle;
  // wordHeading aligns the headword with quiet grammatical metadata.
  readonly wordHeading: ViewStyle;
  // wordPartOfSpeech keeps grammar secondary to the pronunciation line.
  readonly wordPartOfSpeech: TextStyle;
  // wordPhonetics makes pronunciation the primary supporting cue in each result.
  readonly wordPhonetics: TextStyle;
  // wordTranslation keeps the Russian meaning visible inside every result bubble.
  readonly wordTranslation: TextStyle;
  // emptyState centers settled empty-result guidance.
  readonly emptyState: ViewStyle;
};

// dictionaryPickerPanelStyles define a bounded replacement workspace inside setup.
export const dictionaryPickerPanelStyles: DictionaryPickerPanelStyles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  targetWord: {
    fontFamily: fontFamilies.bodyHeavy,
  },
  targetWordPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  targetWordTranslation: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 16,
  },
  resultSummary: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 17,
    minHeight: 17,
  },
  listViewport: {
    borderRadius: radii.md,
    borderWidth: 1,
    height: 320,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.soft,
  },
  listMaterial: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    padding: 6,
  },
  wordRow: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 10,
    minHeight: 82,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#241a38',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
  },
  wordRowPressed: {
    elevation: 0,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  wordRowGradient: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  wordLevelRail: {
    borderRadius: radii.pill,
    height: 28,
    width: 3,
  },
  wordHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
    minWidth: 0,
  },
  wordPartOfSpeech: {
    flexShrink: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 15,
  },
  wordPhonetics: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    letterSpacing: 0.12,
    lineHeight: 19,
  },
  wordTranslation: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 132,
    padding: 18,
  },
});
