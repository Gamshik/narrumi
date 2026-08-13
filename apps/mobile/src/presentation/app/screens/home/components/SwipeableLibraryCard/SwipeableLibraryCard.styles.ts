import { StyleSheet, type ViewStyle } from 'react-native';

import { radii, shadows } from '@presentation/theme';

// SwipeableLibraryCardStyles owns geometry shared by completed series and draft rows.
type SwipeableLibraryCardStyles = {
  // cardMotion keeps the moving foreground opaque and full width.
  readonly cardMotion: ViewStyle;
  // cardPressable preserves geometry while providing restrained tap feedback.
  readonly cardPressable: ViewStyle;
  // cardPressablePressed softens the row without shrinking its reveal boundary.
  readonly cardPressablePressed: ViewStyle;
  // shadowShell preserves Sorbet depth outside the clipped native swipe row.
  readonly shadowShell: ViewStyle;
  // swipeContainer clips both layers to one shared rounded silhouette.
  readonly swipeContainer: ViewStyle;
};

// styles keep swipe behavior visually identical for every Home library row.
export const styles: SwipeableLibraryCardStyles = StyleSheet.create({
  cardMotion: {
    width: '100%',
  },
  cardPressable: {
    width: '100%',
  },
  cardPressablePressed: {
    opacity: 0.96,
  },
  shadowShell: {
    borderRadius: radii.lg,
    ...shadows.soft,
  },
  swipeContainer: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});
