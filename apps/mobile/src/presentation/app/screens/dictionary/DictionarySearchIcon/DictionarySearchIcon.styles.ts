import { StyleSheet, type ViewStyle } from 'react-native';

// DictionarySearchIconStyles defines the fixed geometry for the animated search bubble.
type DictionarySearchIconStyles = {
  // container reserves the complete touch target inside the input.
  readonly container: ViewStyle;
  // halo expands behind the focused bubble without changing search-row layout.
  readonly halo: ViewStyle;
  // mainBubble holds the vector icon and its internal Sorbet lighting.
  readonly mainBubble: ViewStyle;
  // material fills the complete animated bubble or droplet.
  readonly material: ViewStyle;
  // pressable centers the visual bubble inside its accessible touch target.
  readonly pressable: ViewStyle;
  // root positions the halo and satellite relative to the main bubble.
  readonly root: ViewStyle;
  // satellite is released on focus and reclaimed on blur.
  readonly satellite: ViewStyle;
  // tapDropletPrimary is the brighter bubble released toward the top-right.
  readonly tapDropletPrimary: ViewStyle;
  // tapDropletSecondary balances the press burst toward the lower-left.
  readonly tapDropletSecondary: ViewStyle;
  // tapRing visualizes the short pressure wave caused by a direct tap.
  readonly tapRing: ViewStyle;
};

// dictionarySearchIconStyles keeps animation transform-only and independent from app layout.
export const dictionarySearchIconStyles: DictionarySearchIconStyles =
  StyleSheet.create({
    container: {
      height: 40,
      width: 40,
    },
    pressable: {
      alignItems: 'center',
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    root: {
      alignItems: 'center',
      height: 36,
      justifyContent: 'center',
      overflow: 'visible',
      width: 36,
    },
    halo: {
      borderRadius: 17,
      borderWidth: 1,
      height: 34,
      position: 'absolute',
      width: 34,
    },
    mainBubble: {
      alignItems: 'center',
      borderRadius: 15,
      borderWidth: 1,
      height: 36,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 36,
    },
    material: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    satellite: {
      borderRadius: 5,
      height: 10,
      overflow: 'hidden',
      position: 'absolute',
      right: 1,
      top: 1,
      width: 10,
      zIndex: 3,
    },
    tapRing: {
      borderRadius: 18,
      borderWidth: 1.5,
      height: 36,
      position: 'absolute',
      width: 36,
      zIndex: 1,
    },
    tapDropletPrimary: {
      borderRadius: 4,
      height: 8,
      position: 'absolute',
      right: 4,
      top: 4,
      width: 8,
      zIndex: 4,
    },
    tapDropletSecondary: {
      borderRadius: 3,
      bottom: 6,
      height: 6,
      left: 6,
      position: 'absolute',
      width: 6,
      zIndex: 4,
    },
  });
