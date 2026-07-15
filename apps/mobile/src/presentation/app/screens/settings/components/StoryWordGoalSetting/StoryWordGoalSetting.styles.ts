import { StyleSheet } from 'react-native';

import { fontFamilies } from '@presentation/theme';

// storyWordGoalSettingStyles define the focused copy and inset Sorbet control surface.
export const storyWordGoalSettingStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 17,
    lineHeight: 22,
  },
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 4,
  },
  valueNumber: {
    fontFamily: fontFamilies.displayHeavy,
    fontSize: 21,
    lineHeight: 24,
  },
  valueUnit: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 16,
  },
});
