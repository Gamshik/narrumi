import {
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  fontFamilies,
  radii,
  tabBarLayout,
  type AppColors,
} from '@presentation/theme';

// SorbetTabBarStyles defines the layered toy-gel shell and equal-width navigation geometry.
export type SorbetTabBarStyles = {
  // root positions the floating dock while keeping its exterior glow unclipped.
  readonly root: ViewStyle;
  // toyShell clips every candy-material layer into one inflated capsule.
  readonly toyShell: ViewStyle;
  // toySurface fills the capsule with the same translucent colors as background bubbles.
  readonly toySurface: ViewStyle;
  // shellHighlight adds the large oval reflection used by Sorbet background toys.
  readonly shellHighlight: ViewStyle;
  // shellShade rounds the lower edge with a soft grape-colored toy shadow.
  readonly shellShade: ViewStyle;
  // activeIndicator positions the single moving selection bubble above the toy shell.
  readonly activeIndicator: ViewStyle;
  // rippleClip keeps the wide touch wave clipped inside the candy capsule.
  readonly rippleClip: ViewStyle;
  // pressRippleBloom is the broad translucent toy-gel wash behind the touch ring.
  readonly pressRippleBloom: ViewStyle;
  // pressRippleFront is the high-contrast primary circle expanding from the item.
  readonly pressRippleFront: ViewStyle;
  // pressRippleEcho is the delayed secondary circle that completes the liquid response.
  readonly pressRippleEcho: ViewStyle;
  // selectionTrail is the delayed droplet that follows the active bubble during travel.
  readonly selectionTrail: ViewStyle;
  // itemContainer gives every destination the same horizontal hit area.
  readonly itemContainer: ViewStyle;
  // itemPressable preserves the full 62-point vertical navigation target.
  readonly itemPressable: ViewStyle;
  // iconSlot aligns both cross-fading icon layers over the moving lens.
  readonly iconSlot: ViewStyle;
  // iconLayer overlays active and inactive vector strokes without layout shifts.
  readonly iconLayer: ViewStyle;
  // labelSlot reserves stable space while labels cross-fade and rise into focus.
  readonly labelSlot: ViewStyle;
  // label is the quiet destination caption used by inactive tabs.
  readonly label: TextStyle;
  // labelActive applies the branded emphasis to the focused caption.
  readonly labelActive: TextStyle;
  // labelLayer overlays both caption states without changing the bar geometry.
  readonly labelLayer: TextStyle;
  // focusDot is the tiny meniscus below the active caption.
  readonly focusDot: ViewStyle;
};

// createSorbetTabBarStyles binds the toy-like Sorbet material to the active theme.
export function createSorbetTabBarStyles(
  colors: AppColors,
): SorbetTabBarStyles {
  return StyleSheet.create({
    root: {
      position: 'absolute',
      left: tabBarLayout.horizontalMargin,
      right: tabBarLayout.horizontalMargin,
      height: tabBarLayout.height,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.pill,
      shadowColor: colors.tabBarGlow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
      elevation: 8,
    },
    toyShell: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.tabBarBorder,
      borderRadius: radii.pill,
      backgroundColor: colors.tabBarSurface,
    },
    toySurface: {
      ...StyleSheet.absoluteFill,
    },
    shellHighlight: {
      position: 'absolute',
      top: 4,
      left: 28,
      width: '42%',
      height: 17,
      borderRadius: radii.pill,
      backgroundColor: colors.tabBarToyHighlight,
      transform: [{ rotate: '-5deg' }],
    },
    shellShade: {
      position: 'absolute',
      right: -16,
      bottom: -22,
      width: '62%',
      height: 50,
      borderRadius: radii.pill,
      backgroundColor: colors.tabBarToyShade,
      transform: [{ rotate: '5deg' }],
    },
    activeIndicator: {
      position: 'absolute',
      top: 4,
      left: 0,
      width: tabBarLayout.activeIconSize,
      height: tabBarLayout.activeIconSize,
      borderRadius: tabBarLayout.activeIconSize / 2,
    },
    rippleClip: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
      borderRadius: radii.pill,
    },
    pressRippleBloom: {
      position: 'absolute',
      top: 4,
      left: 0,
      width: tabBarLayout.activeIconSize,
      height: tabBarLayout.activeIconSize,
      borderRadius: tabBarLayout.activeIconSize / 2,
      backgroundColor: colors.tabBarRippleBloom,
    },
    pressRippleFront: {
      position: 'absolute',
      top: 4,
      left: 0,
      width: tabBarLayout.activeIconSize,
      height: tabBarLayout.activeIconSize,
      borderWidth: 1.5,
      borderColor: colors.tabBarRippleFront,
      borderRadius: tabBarLayout.activeIconSize / 2,
      shadowColor: colors.tabBarRippleFront,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.24,
      shadowRadius: 3,
    },
    pressRippleEcho: {
      position: 'absolute',
      top: 4,
      left: 0,
      width: tabBarLayout.activeIconSize,
      height: tabBarLayout.activeIconSize,
      borderWidth: 1,
      borderColor: colors.tabBarRippleEcho,
      borderRadius: tabBarLayout.activeIconSize / 2,
    },
    selectionTrail: {
      position: 'absolute',
      top: 19,
      left: 15,
      width: 10,
      height: 10,
      borderRadius: radii.pill,
      backgroundColor: colors.tabBarTrail,
      shadowColor: colors.tabBarTrail,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.34,
      shadowRadius: 5,
    },
    itemContainer: {
      flex: 1,
      height: tabBarLayout.height,
    },
    itemPressable: {
      height: tabBarLayout.height,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 4,
      paddingBottom: 2,
    },
    iconSlot: {
      position: 'relative',
      width: 44,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconLayer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelSlot: {
      position: 'relative',
      width: '100%',
      height: 16,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    label: {
      color: colors.labelSecondary,
      fontFamily: fontFamilies.bodyHeavy,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.12,
      textAlign: 'center',
    },
    labelActive: {
      color: colors.systemBlue,
    },
    labelLayer: {
      position: 'absolute',
      left: 2,
      right: 2,
    },
    focusDot: {
      position: 'absolute',
      bottom: 0,
      width: 3,
      height: 3,
      borderRadius: radii.pill,
      backgroundColor: colors.systemBlue,
    },
  });
}
