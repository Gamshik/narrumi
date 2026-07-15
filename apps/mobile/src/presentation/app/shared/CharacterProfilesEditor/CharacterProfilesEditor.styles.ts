import { StyleSheet } from 'react-native';

import { fontFamilies, radii, type AppColors } from '@presentation/theme';

// CharacterProfilesEditorStyles is the exact themed style contract used by the editor.
export type CharacterProfilesEditorStyles = ReturnType<typeof StyleSheet.create>;

// createCharacterProfilesEditorStyles keeps the editor visually aligned with other form fields.
export function createCharacterProfilesEditorStyles(
  colors: AppColors,
): CharacterProfilesEditorStyles {
  return StyleSheet.create({
    section: {
      gap: 10,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    heading: {
      color: colors.systemPurple,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
      letterSpacing: 0.7,
      marginTop: 6,
    },
    count: {
      color: colors.labelTertiary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 11,
      marginTop: 6,
      textAlign: 'right',
    },
    list: {
      gap: 9,
    },
    row: {
      backgroundColor: colors.bubbleSurfaceMuted,
      borderColor: colors.bubbleBorder,
      borderRadius: radii.md,
      borderWidth: 1,
      gap: 8,
      padding: 10,
    },
    nameRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    input: {
      backgroundColor: colors.backgroundTertiary,
      borderColor: colors.pillBorder,
      borderRadius: radii.md,
      borderWidth: 1,
      color: colors.labelPrimary,
      flex: 1,
      fontFamily: fontFamilies.body,
      fontSize: 15,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 9,
      textAlign: 'left',
    },
    inputFocused: {
      borderColor: colors.systemBlue,
      borderWidth: 2,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    descriptionInput: {
      flex: 0,
      lineHeight: 20,
      minHeight: 58,
      paddingTop: 10,
    },
    removeButton: {
      alignItems: 'center',
      backgroundColor: `${colors.systemRed}12`,
      borderRadius: radii.pill,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    removeText: {
      color: colors.systemRed,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 20,
      lineHeight: 22,
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.58,
    },
    addButton: {
      alignItems: 'center',
      alignSelf: 'stretch',
      borderColor: colors.systemBlue,
      justifyContent: 'center',
      minHeight: 44,
      paddingVertical: 9,
      width: '100%',
    },
    addButtonText: {
      color: colors.systemBlue,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}
