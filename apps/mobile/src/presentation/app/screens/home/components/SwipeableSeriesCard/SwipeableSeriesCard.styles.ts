import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii, shadows } from '@presentation/theme';

// SwipeableSeriesCardStyles lists every layout and typography rule owned by the series row.
type SwipeableSeriesCardStyles = {
  // badge keeps the compact CEFR marker stable during the swipe.
  readonly badge: ViewStyle;
  // badgeText styles the CEFR value with the heavier metadata face.
  readonly badgeText: TextStyle;
  // cardMotion keeps the moving foreground completely opaque and full width.
  readonly cardMotion: ViewStyle;
  // cardPressable preserves full geometry while providing restrained tap feedback.
  readonly cardPressable: ViewStyle;
  // cardPressablePressed softens the opaque row without shrinking its reveal boundary.
  readonly cardPressablePressed: ViewStyle;
  // cardSurface defines the fixed, compact saved-series geometry.
  readonly cardSurface: ViewStyle;
  // deletingRow reserves a compact status line when deletion is in progress.
  readonly deletingRow: ViewStyle;
  // header aligns series copy and level metadata.
  readonly header: ViewStyle;
  // headerCopy lets long series titles truncate without moving the badge.
  readonly headerCopy: ViewStyle;
  // meta styles the compact genre and tone line.
  readonly meta: TextStyle;
  // shadowShell preserves Sorbet depth outside the clipped native swipe row.
  readonly shadowShell: ViewStyle;
  // swipeContainer clips both layers to exactly one shared rounded silhouette.
  readonly swipeContainer: ViewStyle;
  // title styles the stable single-line series name.
  readonly title: TextStyle;
};

// styles keep the swipeable series row visually self-contained and reusable on Home.
export const styles: SwipeableSeriesCardStyles = StyleSheet.create({
  badge: {
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
  },
  cardMotion: {
    width: '100%',
  },
  cardPressable: {
    width: '100%',
  },
  cardPressablePressed: {
    opacity: 0.96,
  },
  cardSurface: {
    borderRadius: radii.lg,
    gap: 8,
    height: 88,
    justifyContent: 'center',
    padding: 16,
  },
  deletingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  shadowShell: {
    borderRadius: radii.lg,
    ...shadows.soft,
  },
  swipeContainer: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.18,
    lineHeight: 23,
  },
});
