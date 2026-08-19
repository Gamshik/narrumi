import { StyleSheet } from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  type AppColors,
} from '@presentation/theme';

// createFreeTextAnswerComposerStyles builds theme-safe Sorbet reply controls.
export function createFreeTextAnswerComposerStyles(
  colors: AppColors,
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    trigger: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.md,
      backgroundColor: colors.pillSurface,
    },
    triggerText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 14,
      lineHeight: 20,
    },
    composer: {
      gap: 10,
      marginTop: 6,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.bubbleBorder,
      borderRadius: radii.lg,
      backgroundColor: colors.bubbleSurfaceRaised,
      ...shadows.soft,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    modePill: {
      minHeight: 38,
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.pillSurface,
    },
    modePillSelected: {
      borderColor: `${colors.systemBlue}55`,
      backgroundColor: colors.pillSelectedSurface,
    },
    modeText: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      lineHeight: 18,
    },
    modeTextSelected: {
      color: colors.systemBlue,
    },
    directionLabel: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
      letterSpacing: 0.7,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 104,
      maxHeight: 144,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: radii.md,
      backgroundColor: colors.backgroundTertiary,
      color: colors.labelPrimary,
      fontFamily: fontFamilies.body,
      fontSize: 16,
      lineHeight: 23,
      textAlignVertical: 'top',
    },
    inputFocused: {
      borderColor: `${colors.systemBlue}88`,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    quietText: {
      flex: 1,
      color: colors.labelTertiary,
      fontFamily: fontFamilies.body,
      fontSize: 11,
      lineHeight: 16,
    },
    counter: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
      lineHeight: 16,
    },
    guidance: {
      gap: 4,
      padding: 11,
      borderRadius: radii.sm,
      backgroundColor: colors.badgeWarningSurface,
    },
    guidanceTitle: {
      color: colors.systemOrange,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 12,
      lineHeight: 17,
    },
    guidanceText: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.body,
      fontSize: 13,
      lineHeight: 19,
    },
    errorText: {
      color: colors.systemRed,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 17,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    secondaryAction: {
      minHeight: 46,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: radii.md,
      backgroundColor: colors.pillSurface,
    },
    primaryAction: {
      minHeight: 46,
      flex: 1.35,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: radii.md,
      backgroundColor: colors.systemBlue,
      shadowColor: colors.systemBlue,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 5,
    },
    disabled: {
      opacity: 0.52,
    },
    secondaryActionText: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      lineHeight: 18,
    },
    primaryActionText: {
      color: '#ffffff',
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}

// FreeTextAnswerComposerStyles is the themed style contract used by the component.
export type FreeTextAnswerComposerStyles = ReturnType<
  typeof createFreeTextAnswerComposerStyles
>;
