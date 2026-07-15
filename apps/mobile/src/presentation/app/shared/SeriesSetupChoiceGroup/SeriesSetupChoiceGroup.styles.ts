import { StyleSheet } from 'react-native';

import { darkColors, lightColors } from '@presentation/theme';

// seriesSetupChoiceGroupStyles keeps dark selected choices dimensional without bright fills.
export const seriesSetupChoiceGroupStyles = StyleSheet.create({
  darkOptionGeometry: {
    borderColor: 'transparent',
    borderWidth: 1,
  },
  selectedDepth: {
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  lightSelected: {
    shadowColor: lightColors.systemPurple,
  },
  darkSelected: {
    backgroundColor: darkColors.bubbleSurfaceRaised,
    borderColor: darkColors.pillBorder,
    shadowColor: darkColors.systemPurple,
  },
  darkSelectedText: {
    color: darkColors.labelPrimary,
  },
});
