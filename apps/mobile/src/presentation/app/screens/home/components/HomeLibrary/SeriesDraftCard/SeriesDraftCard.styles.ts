import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii } from '@presentation/theme';

// SeriesDraftCardStyles names the self-contained Sorbet draft-row geometry.
type SeriesDraftCardStyles = {
  // cardSurface aligns every child on one stable horizontal center line.
  readonly cardSurface: ViewStyle;
  // copy centers the two-line text group vertically beside the progress marker.
  readonly copy: ViewStyle;
  // meta provides one quiet line for mode and completion state.
  readonly meta: TextStyle;
  // progressMarker centers the short progress value inside one restrained accent block.
  readonly progressMarker: ViewStyle;
  // progressText uses explicit metrics so the value is optically centered in its marker.
  readonly progressText: TextStyle;
  // title keeps draft names on the shared Home typography scale.
  readonly title: TextStyle;
};

// styles keep the resumable draft visually aligned with saved-series rows.
export const styles: SeriesDraftCardStyles = StyleSheet.create({
  cardSurface: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 12,
    height: 88,
    padding: 16,
  },
  copy: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  progressMarker: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  progressText: {
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 16,
    textAlign: 'center',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.18,
    lineHeight: 23,
  },
});
