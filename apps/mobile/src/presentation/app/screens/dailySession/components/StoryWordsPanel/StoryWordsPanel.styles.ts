import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii } from '@presentation/theme';

// StoryWordsPanelStyles defines the stable layout roles owned by Story Words.
type StoryWordsPanelStyles = {
  // header stacks the title row above compact interaction guidance.
  readonly header: ViewStyle;
  // titleRow aligns the section name with the current visible count.
  readonly titleRow: ViewStyle;
  // hintRow aligns tap guidance with the global shuffle action.
  readonly hintRow: ViewStyle;
  // hintText lets guidance yield space to the global action on narrow screens.
  readonly hintText: TextStyle;
  // shuffleButton keeps the global action compact and visually secondary.
  readonly shuffleButton: ViewStyle;
  // shuffleButtonText defines the quieter branded global action label.
  readonly shuffleButtonText: TextStyle;
  // wordGrid wraps the visible set into two scannable columns.
  readonly wordGrid: ViewStyle;
};

// storyWordsPanelStyles keep Story Words compact while preserving tactile controls.
export const storyWordsPanelStyles: StoryWordsPanelStyles = StyleSheet.create({
  header: {
    gap: 5,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  hintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  hintText: {
    flex: 1,
    minWidth: 0,
  },
  shuffleButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  shuffleButtonText: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 11,
    lineHeight: 15,
  },
  wordGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
