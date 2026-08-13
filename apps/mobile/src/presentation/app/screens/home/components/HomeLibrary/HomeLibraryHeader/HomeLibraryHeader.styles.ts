import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies } from '@presentation/theme';

// HomeLibraryHeaderStyles defines one conventional heading-and-action row.
type HomeLibraryHeaderStyles = {
  // createAction prevents the compact command from shrinking beside the heading.
  readonly createAction: ViewStyle;
  // createActionContent provides a readable touch target without hero-scale emphasis.
  readonly createActionContent: ViewStyle;
  // createActionIcon reinforces the visible action label without carrying meaning alone.
  readonly createActionIcon: TextStyle;
  // createActionLabel states the command for sighted and translated interfaces.
  readonly createActionLabel: TextStyle;
  // header aligns the library identity with its independent creation action.
  readonly header: ViewStyle;
  // title gives the content area a stable name beneath the app heading.
  readonly title: TextStyle;
};

// styles keep navigation out of the create action's visual grouping.
export const styles: HomeLibraryHeaderStyles = StyleSheet.create({
  createAction: {
    flexShrink: 0,
  },
  createActionContent: {
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  createActionIcon: {
    color: '#ffffff',
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 22,
  },
  createActionLabel: {
    color: '#ffffff',
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 13,
    includeFontPadding: false,
    lineHeight: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontFamily: fontFamilies.displayHeavy,
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 26,
  },
});
