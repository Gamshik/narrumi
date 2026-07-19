import { StyleSheet } from 'react-native';

import { fontFamilies, radii, type AppColors } from '@presentation/theme';

// SeriesCreativeBriefEditorStyles is the themed style contract for the progressive brief editor.
export type SeriesCreativeBriefEditorStyles = ReturnType<typeof StyleSheet.create>;

// createSeriesCreativeBriefEditorStyles keeps optional story anchors visually quieter than the main idea.
export function createSeriesCreativeBriefEditorStyles(
  colors: AppColors,
): SeriesCreativeBriefEditorStyles {
  return StyleSheet.create({
    section: {
      gap: 12,
    },
    headingBlock: {
      gap: 3,
    },
    heading: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
      letterSpacing: 0.7,
    },
    helper: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.body,
      fontSize: 12,
      lineHeight: 17,
    },
    field: {
      gap: 7,
    },
    label: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 13,
    },
    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.pillBorder,
      borderRadius: radii.md,
      paddingHorizontal: 16,
      backgroundColor: colors.backgroundTertiary,
      color: colors.labelPrimary,
      fontFamily: fontFamilies.body,
      fontSize: 15,
    },
    ideaInput: {
      height: 112,
      paddingTop: 14,
      lineHeight: 21,
    },
    multilineInput: {
      height: 76,
      paddingTop: 13,
      lineHeight: 21,
    },
    disabledInput: {
      opacity: 0.72,
    },
    disclosure: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      backgroundColor: colors.bubbleSurfaceMuted,
    },
    disclosureText: {
      color: colors.labelPrimary,
      flexShrink: 1,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 14,
    },
    disclosureIcon: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 18,
    },
    details: {
      gap: 12,
      paddingTop: 2,
    },
    freedomBlock: {
      gap: 5,
      paddingTop: 2,
    },
  });
}
