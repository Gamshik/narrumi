import { StyleSheet } from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  spacing,
  type AppColors,
} from '@presentation/theme';

// CreateSeriesFlowStyles is the themed visual contract for the four-card modal.
export type CreateSeriesFlowStyles = ReturnType<
  typeof createCreateSeriesFlowStyles
>;

// createCreateSeriesFlowStyles maps the Sorbet tokens onto focused setup cards.
export function createCreateSeriesFlowStyles(
  colors: AppColors,
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: colors.backgroundPrimary,
    },
    content: {
      flex: 1,
      zIndex: 2,
    },
    header: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    headerCopy: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.display,
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },
    saveButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    saveButtonText: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
    },
    setupOverview: {
      minHeight: 91,
      gap: 7,
      marginHorizontal: spacing.md,
      marginBottom: 9,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.bubbleBorder,
      borderRadius: radii.md,
      backgroundColor: colors.bubbleSurfaceMuted,
      ...shadows.soft,
    },
    setupOverviewEmpty: {
      justifyContent: 'center',
    },
    setupOverviewTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressTitle: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
      letterSpacing: 0.75,
    },
    progressCount: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
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
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressNode: {
      width: 23,
      height: 23,
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
      width: 28,
      height: 28,
      borderWidth: 2,
      borderColor: colors.systemBlue,
      backgroundColor: colors.systemBlue,
      shadowColor: colors.systemPurple,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    progressNodeText: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 10,
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
    setupOverviewMemory: {
      marginTop: 1,
      paddingTop: 7,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    memoryRow: {
      gap: 6,
      paddingRight: 6,
    },
    memoryChip: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.pillSurface,
    },
    memoryChipLabel: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 9,
    },
    memoryChipValue: {
      maxWidth: 132,
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 9,
    },
    questMotion: {
      flex: 1,
    },
    questStage: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingBottom: 10,
    },
    card: {
      flex: 1,
      gap: 0,
      padding: 0,
    },
    cardScroll: {
      flex: 1,
    },
    cardContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
    },
    cardTitle: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.displayHeavy,
      fontSize: 29,
      letterSpacing: -0.4,
      lineHeight: 34,
      marginBottom: 8,
    },
    cardBody: {
      gap: 12,
    },
    cardFooter: {
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
      backgroundColor: colors.bubbleSurfaceMuted,
    },
    footerBack: {
      flex: 0.74,
    },
    footerNext: {
      flex: 1.26,
    },
    footerOnly: {
      flex: 1,
    },
    footerButton: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    footerBackText: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
    },
    footerNextText: {
      color: '#ffffff',
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      textAlign: 'center',
    },
    optionList: {
      gap: 10,
    },
    optionCard: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.lg,
      backgroundColor: colors.backgroundTertiary,
    },
    optionCardSelected: {
      borderColor: `${colors.systemBlue}66`,
      backgroundColor: colors.pillSelectedSurface,
      ...shadows.soft,
    },
    optionIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.badgeAccentSurface,
    },
    optionIconText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.displayHeavy,
      fontSize: 20,
    },
    optionTitle: {
      flex: 1,
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 14,
    },
    optionRadio: {
      width: 19,
      height: 19,
      borderWidth: 2,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.bubbleSurfaceRaised,
    },
    optionRadioSelected: {
      borderWidth: 5,
      borderColor: colors.systemBlue,
    },
    aiActionButton: {
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    aiActionButtonText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      textAlign: 'center',
    },
    status: {
      marginTop: 10,
    },
  });
}
