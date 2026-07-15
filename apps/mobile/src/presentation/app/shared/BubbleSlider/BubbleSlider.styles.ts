import { StyleSheet } from 'react-native';

import { fontFamilies, radii } from '@presentation/theme';

// bubbleSliderStyles define stable Sorbet slider geometry while colors remain theme-owned.
export const bubbleSliderStyles = StyleSheet.create({
  container: {
    minHeight: 44,
    width: '100%',
  },
  gestureArea: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  trackShell: {
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
    position: 'absolute',
    top: 27,
    width: '100%',
  },
  fill: {
    borderRadius: radii.pill,
    height: '100%',
    overflow: 'hidden',
  },
  particle: {
    borderRadius: radii.pill,
    position: 'absolute',
  },
  particleLarge: {
    height: 7,
    top: 15,
    width: 7,
  },
  particleMedium: {
    height: 5,
    top: 18,
    width: 5,
  },
  particleSmall: {
    height: 4,
    top: 12,
    width: 4,
  },
  thumb: {
    borderRadius: radii.pill,
    borderWidth: 3,
    elevation: 4,
    height: 24,
    position: 'absolute',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    top: 18,
    width: 24,
  },
  labels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 0,
    paddingHorizontal: 2,
  },
  endpointLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 16,
  },
});
