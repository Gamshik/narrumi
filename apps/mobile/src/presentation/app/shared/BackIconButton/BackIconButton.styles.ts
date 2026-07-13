import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// BackIconButtonStyles defines the reusable 44-point navigation control geometry.
type BackIconButtonStyles = {
  // container preserves layout and accepts screen-specific positioning.
  readonly container: ViewStyle;
  // button renders the circular Sorbet navigation surface.
  readonly button: ViewStyle;
  // icon optically centers the back arrow inside the circular target.
  readonly icon: TextStyle;
};

// backIconButtonStyles keeps all Back and Exit controls visually identical.
export const backIconButtonStyles: BackIconButtonStyles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
  icon: {
    fontSize: 27,
    lineHeight: 31,
    textAlign: 'center',
  },
});
