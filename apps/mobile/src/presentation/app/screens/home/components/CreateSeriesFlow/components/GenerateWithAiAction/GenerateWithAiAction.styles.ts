import { StyleSheet } from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  type AppColors,
} from '@presentation/theme';

// GenerateWithAiActionStyles is the themed visual contract for the action and its loading state.
export type GenerateWithAiActionStyles = ReturnType<
  typeof createGenerateWithAiActionStyles
>;

// createGenerateWithAiActionStyles builds one stable-height Sorbet action surface.
export function createGenerateWithAiActionStyles(
  colors: AppColors,
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    button: {
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    buttonText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      textAlign: 'center',
    },
    loadingSurface: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      overflow: 'hidden',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: `${colors.systemPurple}55`,
      borderRadius: radii.pill,
      backgroundColor: colors.badgeAccentSurface,
      ...shadows.soft,
    },
    loadingSheen: {
      position: 'absolute',
      top: -24,
      left: 18,
      width: 144,
      height: 42,
      borderRadius: radii.pill,
      backgroundColor: colors.bubbleBorder,
      opacity: 0.2,
      transform: [{ rotate: '-8deg' }],
    },
    loadingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: radii.pill,
    },
    loadingText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
    },
  });
}
