import { StyleSheet } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

// EpisodeSetupDetailsCardStyles is the themed contract for episode direction choices.
export type EpisodeSetupDetailsCardStyles = ReturnType<
  typeof createEpisodeSetupDetailsCardStyles
>;

// createEpisodeSetupDetailsCardStyles keeps the first task concise and readable.
export function createEpisodeSetupDetailsCardStyles(
  colors: AppColors,
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    card: {
      gap: 16,
      padding: 18,
      borderColor: colors.bubbleBorder,
    },
    heading: {
      gap: 2,
    },
    title: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.displayHeavy,
      fontSize: 27,
      letterSpacing: -0.35,
      lineHeight: 33,
    },
    subtitle: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
