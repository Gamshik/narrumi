import { StyleSheet } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

import type { AppColors } from '@presentation/theme';
import { fontFamilies, radii } from '@presentation/theme';

// StoryContinuationPreludeStyles defines the complete visual contract for the inline generation cue.
export type StoryContinuationPreludeStyles = {
  // container keeps the prelude cardless inside the existing interaction surface.
  readonly container: ViewStyle;
  // header aligns the quiet state marker with its compact label.
  readonly header: ViewStyle;
  // pulse holds the animated halo and its fixed center point.
  readonly pulse: ViewStyle;
  // pulseHalo provides a restrained branded glow around the center point.
  readonly pulseHalo: ViewStyle;
  // pulseCore keeps the active state readable when motion is reduced.
  readonly pulseCore: ViewStyle;
  // label identifies the generated content without competing with story text.
  readonly label: TextStyle;
  // message connects the waiting state to the learner's choice.
  readonly message: TextStyle;
  // track clips the traveling light to a single narrative thread.
  readonly track: ViewStyle;
  // trackBase keeps a quiet line visible beneath the moving light.
  readonly trackBase: ViewStyle;
  // trackGlow contains the animated gradient highlight.
  readonly trackGlow: ViewStyle;
  // trackGlowGradient fills the traveling highlight geometry.
  readonly trackGlowGradient: ViewStyle;
  // draft groups the future-text traces into one calm rhythm.
  readonly draft: ViewStyle;
  // draftLine defines the shared hairline-like future-text material.
  readonly draftLine: ViewStyle;
  // draftLineLong sets the first future-text trace width.
  readonly draftLineLong: ViewStyle;
  // draftLineMedium sets the second future-text trace width.
  readonly draftLineMedium: ViewStyle;
  // draftLineShort sets the final future-text trace width.
  readonly draftLineShort: ViewStyle;
};

// createStoryContinuationPreludeStyles maps semantic theme colors to the local generation cue.
export function createStoryContinuationPreludeStyles(
  colors: AppColors,
): StoryContinuationPreludeStyles {
  return StyleSheet.create<StoryContinuationPreludeStyles>({
    container: {
      gap: 9,
      marginTop: 10,
      overflow: 'hidden',
      paddingHorizontal: 2,
      paddingVertical: 10,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    pulse: {
      alignItems: 'center',
      height: 14,
      justifyContent: 'center',
      width: 14,
    },
    pulseHalo: {
      backgroundColor: `${colors.systemPurple}24`,
      borderRadius: radii.pill,
      height: 14,
      position: 'absolute',
      width: 14,
    },
    pulseCore: {
      backgroundColor: colors.systemPurple,
      borderRadius: radii.pill,
      height: 5,
      shadowColor: colors.systemPurple,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.42,
      shadowRadius: 5,
      width: 5,
    },
    label: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.05,
      textTransform: 'uppercase',
    },
    message: {
      color: colors.labelPrimary,
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 14,
      lineHeight: 21,
    },
    track: {
      height: 8,
      justifyContent: 'center',
      overflow: 'hidden',
      width: '100%',
    },
    trackBase: {
      backgroundColor: `${colors.labelTertiary}28`,
      borderRadius: radii.pill,
      height: 2,
      width: '100%',
    },
    trackGlow: {
      height: 8,
      left: 0,
      position: 'absolute',
      width: 56,
    },
    trackGlowGradient: {
      borderRadius: radii.pill,
      flex: 1,
    },
    draft: {
      gap: 6,
      paddingTop: 1,
    },
    draftLine: {
      backgroundColor: `${colors.systemPurple}2c`,
      borderRadius: radii.pill,
      height: 4,
    },
    draftLineLong: {
      width: '88%',
    },
    draftLineMedium: {
      backgroundColor: `${colors.systemTeal}24`,
      width: '68%',
    },
    draftLineShort: {
      backgroundColor: `${colors.systemPink}20`,
      width: '44%',
    },
  });
}
