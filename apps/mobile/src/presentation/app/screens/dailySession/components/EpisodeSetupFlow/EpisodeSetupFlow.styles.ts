import { StyleSheet } from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  spacing,
  type AppColors,
} from '@presentation/theme';

// EpisodeSetupFlowStyles is the themed visual contract for the two-step flow.
export type EpisodeSetupFlowStyles = ReturnType<
  typeof createEpisodeSetupFlowStyles
>;

// createEpisodeSetupFlowStyles maps Sorbet tokens onto progress, summaries, and motion.
export function createEpisodeSetupFlowStyles(
  colors: AppColors,
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    flow: {
      gap: 12,
    },
    progressSurface: {
      minHeight: 100,
      gap: 7,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderColor: colors.bubbleBorder,
    },
    progressTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    progressTitle: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
      letterSpacing: 0.75,
    },
    progressPath: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    progressItemLast: {
      flex: 0,
    },
    progressNodeButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressNode: {
      width: 25,
      height: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.backgroundTertiary,
    },
    progressNodeReached: {
      borderColor: `${colors.systemBlue}66`,
      backgroundColor: colors.pillSelectedSurface,
    },
    progressNodeActive: {
      width: 30,
      height: 30,
      borderWidth: 2,
      borderColor: colors.systemBlue,
      backgroundColor: colors.systemBlue,
      shadowColor: colors.systemPurple,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 6,
      elevation: 3,
    },
    progressNodeText: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 10,
      lineHeight: 14,
      textAlign: 'center',
    },
    progressNodeTextReached: {
      color: colors.systemBlue,
    },
    progressNodeTextActive: {
      color: '#ffffff',
    },
    progressConnector: {
      flex: 1,
      height: 3,
      marginHorizontal: 2,
      borderRadius: radii.pill,
      backgroundColor: colors.pillSelectedSurface,
    },
    progressConnectorReached: {
      backgroundColor: `${colors.systemBlue}88`,
    },
    progressCount: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
    },
    summaryArea: {
      marginTop: 1,
      paddingTop: 7,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    summaryRow: {
      gap: 6,
      paddingRight: 6,
    },
    summaryChip: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.pillSurface,
    },
    summaryChipLabel: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
    },
    summaryChipValue: {
      maxWidth: 132,
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 9,
    },
    summaryChipPressed: {
      opacity: 0.85,
    },
    stepMotion: {
      minWidth: 0,
    },
    footerPosition: {
      position: 'absolute',
      left: spacing.md,
      right: spacing.md,
      zIndex: 5,
    },
    footerSurface: {
      padding: 10,
      borderWidth: 1,
      borderColor: colors.bubbleBorder,
      borderRadius: radii.xl,
      backgroundColor: colors.bubbleSurfaceMuted,
      ...shadows.soft,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 9,
    },
    footerBack: {
      flex: 0.72,
    },
    footerPrimary: {
      flex: 1.28,
    },
    footerButton: {
      minHeight: 50,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    footerBackText: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
    },
    footerPrimaryText: {
      color: '#ffffff',
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      textAlign: 'center',
    },
    generationSurface: {
      minHeight: 50,
      flex: 1.28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: `${colors.systemPurple}55`,
      borderRadius: radii.pill,
      backgroundColor: colors.badgeAccentSurface,
      ...shadows.soft,
    },
    generationSheen: {
      position: 'absolute',
      top: -25,
      left: 18,
      width: 154,
      height: 44,
      borderRadius: radii.pill,
      backgroundColor: colors.bubbleBorder,
      opacity: 0.2,
      transform: [{ rotate: '-8deg' }],
    },
    generationDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    generationDot: {
      width: 8,
      height: 8,
      borderRadius: radii.pill,
    },
    generationText: {
      flexShrink: 1,
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 12,
      textAlign: 'center',
    },
  });
}
