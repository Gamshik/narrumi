import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// SeriesDetailsEdgeEffectStyles positions persistent controls and the compact title over shared glass.
type SeriesDetailsEdgeEffectStyles = {
  // fill expands the interactive top overlay across the screen without blocking scroll content.
  readonly fill: ViewStyle;
  // controls keeps navigation actions fixed at opposite sides of the compact title.
  readonly controls: ViewStyle;
  // compactTitleContainer reserves a centered lane that cannot intercept control presses.
  readonly compactTitleContainer: ViewStyle;
  // compactTitle keeps long series names readable within the narrow navigation lane.
  readonly compactTitle: TextStyle;
};

// seriesDetailsEdgeEffectStyles keeps series-specific chrome separate from reusable material construction.
export const seriesDetailsEdgeEffectStyles: SeriesDetailsEdgeEffectStyles =
  StyleSheet.create({
    fill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    controls: {
      position: 'absolute',
      left: 20,
      right: 20,
      height: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      zIndex: 2,
    },
    compactTitleContainer: {
      flex: 1,
      minWidth: 0,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactTitle: {
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.25,
      textAlign: 'center',
    },
  });
