import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { fontFamilies, radii } from '@presentation/theme';

// SeriesDeleteActionStyles owns the layered material and geometry-safe feedback inside the lane.
type SeriesDeleteActionStyles = {
  // cluster holds the icon core and delayed caption in one centered composition.
  readonly cluster: ViewStyle;
  // depthGradient shades the lower material so the action feels inflated rather than flat.
  readonly depthGradient: ViewStyle;
  // halo is the oversized grape light clipped inside the destructive material.
  readonly halo: ViewStyle;
  // haloCore adds a brighter center without adding another interactive shape.
  readonly haloCore: ViewStyle;
  // label uses Sorbet caption typography for a compact explicit action.
  readonly label: TextStyle;
  // materialGradient is the semantic red-to-pink base layer.
  readonly materialGradient: ViewStyle;
  // orb is the dimensional visual core containing the trash glyph.
  readonly orb: ViewStyle;
  // orbFill adds translucent top-lit material without fading the glyph.
  readonly orbFill: ViewStyle;
  // orbHighlight creates one restrained specular point on the visual core.
  readonly orbHighlight: ViewStyle;
  // orbShell owns depth outside the clipped translucent icon material.
  readonly orbShell: ViewStyle;
  // pressable keeps the full uncovered lane as the stable touch target.
  readonly pressable: ViewStyle;
  // sheen carries one diagonal light front across the action during reveal.
  readonly sheen: ViewStyle;
  // sheenGradient fills the traveling highlight plane.
  readonly sheenGradient: ViewStyle;
  // surface clips every decorative layer to the shared card silhouette.
  readonly surface: ViewStyle;
};

// styles create one Sorbet material while preserving the native swipe geometry.
export const styles: SeriesDeleteActionStyles = StyleSheet.create({
  cluster: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  depthGradient: {
    ...StyleSheet.absoluteFill,
    opacity: 0.44,
  },
  halo: {
    borderRadius: radii.pill,
    height: 76,
    position: 'absolute',
    right: -22,
    top: 5,
    width: 76,
  },
  haloCore: {
    borderRadius: radii.pill,
    height: 28,
    opacity: 0.2,
    position: 'absolute',
    right: 12,
    top: 10,
    width: 28,
  },
  label: {
    color: '#ffffff',
    fontFamily: fontFamilies.bodyHeavy,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.82,
    lineHeight: 13,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  materialGradient: {
    ...StyleSheet.absoluteFill,
  },
  orb: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbShell: {
    borderRadius: radii.pill,
    elevation: 4,
    height: 46,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    width: 46,
  },
  orbFill: {
    ...StyleSheet.absoluteFill,
    opacity: 0.18,
  },
  orbHighlight: {
    borderRadius: radii.pill,
    height: 13,
    left: 8,
    opacity: 0.56,
    position: 'absolute',
    top: 5,
    transform: [{ rotate: '-18deg' }],
    width: 23,
  },
  pressable: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheen: {
    bottom: -8,
    position: 'absolute',
    right: 6,
    top: -8,
    width: 42,
  },
  sheenGradient: {
    flex: 1,
    opacity: 0.52,
    transform: [{ rotate: '-12deg' }],
  },
  surface: {
    height: '100%',
    overflow: 'hidden',
  },
});
