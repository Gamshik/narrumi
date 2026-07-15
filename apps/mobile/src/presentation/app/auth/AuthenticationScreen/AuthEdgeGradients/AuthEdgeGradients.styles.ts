import { StyleSheet, type ViewStyle } from 'react-native';

// AuthEdgeGradientStyles positions both shallow fades over the authentication canvas.
type AuthEdgeGradientStyles = {
  // bottom anchors the quieter gradient to the lower safe edge.
  readonly bottom: ViewStyle;
  // fill covers the route without intercepting form interaction.
  readonly fill: ViewStyle;
  // top anchors the short upper tint at the top safe edge.
  readonly top: ViewStyle;
};

// authEdgeGradientStyles keeps auth-only edge depth independent from blurred scroll effects.
export const authEdgeGradientStyles: AuthEdgeGradientStyles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 84,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
  },
});
