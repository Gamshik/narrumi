import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies } from '@presentation/theme';

// DeleteConfirmationSheetStyles owns the shared destructive confirmation layout.
type DeleteConfirmationSheetStyles = {
  // action lets both confirmation controls share equal width.
  readonly action: ViewStyle;
  // actionLabel keeps button text centered with explicit font metrics.
  readonly actionLabel: TextStyle;
  // actions aligns cancel and delete on one stable row.
  readonly actions: ViewStyle;
  // content separates confirmation copy, errors, and controls.
  readonly content: ViewStyle;
  // dangerLabel provides high-contrast copy on the destructive surface.
  readonly dangerLabel: TextStyle;
  // message explains the exact local data affected by confirmation.
  readonly message: TextStyle;
};

// styles keep every delete confirmation visually and geometrically identical.
export const styles: DeleteConfirmationSheetStyles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    gap: 14,
  },
  dangerLabel: {
    color: '#ffffff',
    fontWeight: '900',
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
});
