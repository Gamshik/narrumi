import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii, shadows } from '@presentation/theme';

// HomeLibraryStyles owns the stable vertical structure of the unified library.
type HomeLibraryStyles = {
  // emptyCopy explains the next useful action when no completed series exists.
  readonly emptyCopy: TextStyle;
  // emptySurface gives an intentionally quiet state to the unpopulated series section.
  readonly emptySurface: ViewStyle;
  // library keeps the header and lifecycle sections in one predictable vertical flow.
  readonly library: ViewStyle;
  // list separates rows without wrapping them in a second card surface.
  readonly list: ViewStyle;
  // section groups one lifecycle heading with its visible rows or empty state.
  readonly section: ViewStyle;
  // sectionLabel identifies unfinished work separately from completed series.
  readonly sectionLabel: TextStyle;
};

// styles use spacing, rather than a shared control surface, to connect the Home library.
export const styles: HomeLibraryStyles = StyleSheet.create({
  emptyCopy: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  emptySurface: {
    borderRadius: radii.lg,
    justifyContent: 'center',
    minHeight: 88,
    padding: 16,
    ...shadows.soft,
  },
  library: {
    gap: 20,
  },
  list: {
    gap: 10,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 11,
    letterSpacing: 0.7,
  },
});
