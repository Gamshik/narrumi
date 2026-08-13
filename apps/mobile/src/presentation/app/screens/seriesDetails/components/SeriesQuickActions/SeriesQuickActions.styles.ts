import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies } from '@presentation/theme';

// SeriesQuickActionsStyles defines the compact grouped-action layout for a series.
type SeriesQuickActionsStyles = {
  // container keeps both related destinations inside one quiet visual section.
  readonly container: ViewStyle;
  // action shares the available width between the related destinations.
  readonly action: ViewStyle;
  // actionContent keeps each label centered inside one compact tap target.
  readonly actionContent: ViewStyle;
  // divider separates destinations without introducing another button surface.
  readonly divider: ViewStyle;
  // primaryLabel styles the emphasized next-step label.
  readonly primaryLabel: TextStyle;
  // secondaryLabel styles the quieter reading destination label.
  readonly secondaryLabel: TextStyle;
};

// seriesQuickActionsStyles owns layout only; active theme colors stay component-driven.
export const seriesQuickActionsStyles: SeriesQuickActionsStyles =
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 0,
      width: '100%',
    },
    action: {
      flex: 1,
      minWidth: 0,
    },
    actionContent: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    divider: {
      marginVertical: 10,
      width: StyleSheet.hairlineWidth,
    },
    primaryLabel: {
      flexShrink: 1,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 14,
      lineHeight: 19,
      textAlign: 'center',
    },
    secondaryLabel: {
      flexShrink: 1,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 14,
      lineHeight: 19,
      textAlign: 'center',
    },
  });
