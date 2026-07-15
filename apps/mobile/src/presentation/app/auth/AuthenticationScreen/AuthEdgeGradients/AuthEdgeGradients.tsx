import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { authEdgeGradientStyles } from './AuthEdgeGradients.styles';

// AuthEdgeGradientsProps supplies the active Sorbet palette for both quiet edge fades.
type AuthEdgeGradientsProps = {
  // colors keeps edge depth consistent across light and dark authentication themes.
  readonly colors: AppColors;
};

// AuthEdgeGradients adds shallow static depth without blurring the animated background.
export function AuthEdgeGradients({
  colors,
}: AuthEdgeGradientsProps): ReactElement {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={authEdgeGradientStyles.fill}
    >
      <LinearGradient
        colors={colors.edgeFadeTopGradient}
        locations={[0, 0.3, 0.68, 1]}
        style={authEdgeGradientStyles.top}
      />
      <LinearGradient
        colors={colors.modalEdgeFadeBottomGradient}
        locations={[0, 0.54, 1]}
        style={authEdgeGradientStyles.bottom}
      />
    </View>
  );
}
