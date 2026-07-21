import {
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  fontFamilies,
  radii,
  shadows,
  type AppColors,
} from '@presentation/theme';

// DictionaryLevelFilterPopoverStyles defines the anchored Sorbet filter palette.
export type DictionaryLevelFilterPopoverStyles = {
  readonly allOptionContainer: ViewStyle;
  readonly closeButton: ViewStyle;
  readonly closeButtonContainer: ViewStyle;
  readonly closeButtonText: TextStyle;
  readonly content: ViewStyle;
  readonly grid: ViewStyle;
  readonly header: ViewStyle;
  readonly material: ViewStyle;
  readonly option: ViewStyle;
  readonly optionCode: TextStyle;
  readonly optionContainer: ViewStyle;
  readonly optionDescription: TextStyle;
  readonly optionDot: ViewStyle;
  readonly optionFill: ViewStyle;
  readonly panel: ViewStyle;
  readonly panelGlow: ViewStyle;
  readonly root: ViewStyle;
  readonly scrim: ViewStyle;
  readonly subtitle: TextStyle;
  readonly title: TextStyle;
  readonly titleBlock: ViewStyle;
};

// createDictionaryLevelFilterPopoverStyles maps the contextual popover to the active palette.
export function createDictionaryLevelFilterPopoverStyles(
  colors: AppColors,
): DictionaryLevelFilterPopoverStyles {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFill,
      zIndex: 40,
    },
    scrim: {
      ...StyleSheet.absoluteFill,
    },
    panel: {
      borderColor: colors.bubbleBorder,
      borderRadius: radii.lg,
      borderWidth: 1,
      left: 20,
      overflow: 'hidden',
      position: 'absolute',
      right: 20,
      top: 76,
      ...shadows.soft,
    },
    material: {
      ...StyleSheet.absoluteFill,
    },
    panelGlow: {
      backgroundColor: colors.badgeAccentSurface,
      borderRadius: 72,
      height: 108,
      position: 'absolute',
      right: -28,
      top: -44,
      width: 128,
    },
    content: {
      paddingBottom: 14,
      paddingHorizontal: 14,
      paddingTop: 14,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.display,
      fontSize: 19,
      lineHeight: 24,
    },
    subtitle: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.body,
      fontSize: 11,
      lineHeight: 15,
    },
    closeButtonContainer: {
      height: 32,
      width: 32,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.pillSurface,
      borderColor: colors.bubbleBorder,
      borderRadius: 14,
      borderWidth: 1,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    closeButtonText: {
      color: colors.labelSecondary,
      fontSize: 20,
      lineHeight: 22,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    optionContainer: {
      flexBasis: '30%',
      flexGrow: 1,
    },
    allOptionContainer: {
      flexBasis: '100%',
      flexGrow: 0,
    },
    option: {
      alignItems: 'center',
      borderRadius: 15,
      borderWidth: 1,
      height: 50,
      justifyContent: 'center',
      overflow: 'hidden',
      paddingHorizontal: 6,
      position: 'relative',
    },
    optionFill: {
      ...StyleSheet.absoluteFill,
    },
    optionDot: {
      borderRadius: 4,
      height: 6,
      position: 'absolute',
      right: 8,
      top: 8,
      width: 6,
    },
    optionCode: {
      fontFamily: fontFamilies.display,
      fontSize: 16,
      lineHeight: 20,
      textAlign: 'center',
    },
    optionDescription: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 8,
      lineHeight: 11,
      textAlign: 'center',
    },
  });
}
