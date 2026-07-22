import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii, shadows } from '@presentation/theme';

// StoryWordCardStyles defines the geometry and animation layers of one word slot.
type StoryWordCardStyles = {
  // wordBubble defines one compact editable word surface.
  readonly wordBubble: ViewStyle;
  // wordButton owns the full-card dictionary-pick interaction.
  readonly wordButton: ViewStyle;
  // wordGradient provides the restrained raised Sorbet material.
  readonly wordGradient: ViewStyle;
  // replacementGlow clips a local accent wash to only the changing card.
  readonly replacementGlow: ViewStyle;
  // replacementGlowGradient fills the animated local accent wash.
  readonly replacementGlowGradient: ViewStyle;
  // wordCopy keeps word metadata from stretching the action area.
  readonly wordCopy: ViewStyle;
  // wordTitle makes the vocabulary item the strongest content in each bubble.
  readonly wordTitle: TextStyle;
  // translation presents the Russian meaning as a calm secondary line.
  readonly translation: TextStyle;
  // wordMeta keeps pronunciation and grammar on one quiet supporting row.
  readonly wordMeta: ViewStyle;
  // phonetics gives pronunciation stronger hierarchy than grammatical metadata.
  readonly phonetics: TextStyle;
  // partOfSpeech keeps the grammatical category available but visually quiet.
  readonly partOfSpeech: TextStyle;
  // randomButtonSlot anchors the wrapped JellyPressable inside the card corner.
  readonly randomButtonSlot: ViewStyle;
  // randomButton renders one compact rounded randomize affordance.
  readonly randomButton: ViewStyle;
};

// storyWordCardStyles keep each word slot stable while its content transitions locally.
export const storyWordCardStyles: StoryWordCardStyles = StyleSheet.create({
  wordBubble: {
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 112,
    position: 'relative',
    width: '47%',
    ...shadows.soft,
  },
  wordButton: {
    borderRadius: radii.lg,
    height: 112,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 13,
    paddingRight: 48,
  },
  wordGradient: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  replacementGlow: {
    bottom: 0,
    borderRadius: radii.lg,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  replacementGlowGradient: {
    flex: 1,
  },
  wordCopy: {
    gap: 1,
    minWidth: 0,
  },
  wordTitle: {
    fontFamily: fontFamilies.displayHeavy,
    fontSize: 18,
    lineHeight: 23,
  },
  translation: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    lineHeight: 19,
  },
  wordMeta: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
    minWidth: 0,
  },
  phonetics: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    letterSpacing: 0.15,
    lineHeight: 20,
  },
  partOfSpeech: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    letterSpacing: 0.25,
    lineHeight: 15,
  },
  randomButtonSlot: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
  },
  randomButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    elevation: 7,
    height: 32,
    justifyContent: 'center',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    width: 32,
  },
});
