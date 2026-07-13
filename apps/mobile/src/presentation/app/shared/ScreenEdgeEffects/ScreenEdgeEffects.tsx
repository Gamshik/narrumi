import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement, RefObject } from 'react';
import { Animated, View } from 'react-native';

import type { AppColors } from '@presentation/theme';

import { screenEdgeEffectStyles } from './ScreenEdgeEffects.styles';

// ScreenEdgeDepths exposes the shared spacing required to keep scroll endings accessible.
type ScreenEdgeDepths = {
  // top is the tint fade depth below the device top inset.
  readonly top: number;
  // compactTop is the reduced upper fade depth for dense navigation-led screens.
  readonly compactTop: number;
  // bottom is the gradient-only fade depth above the device bottom inset.
  readonly bottom: number;
  // modalBottom is the quieter fade depth used when no bottom navigation is present.
  readonly modalBottom: number;
};

// screenEdgeDepths keeps content padding aligned with the reusable visual material.
export const screenEdgeDepths: ScreenEdgeDepths = {
  top: 124,
  compactTop: 82,
  bottom: 132,
  modalBottom: 88,
};

// ScreenEdgeBottomVariant selects the lower fade appropriate to persistent navigation or a modal canvas.
type ScreenEdgeBottomVariant = 'navigation' | 'modal';
// ScreenEdgeTopVariant selects standard or reduced upper material depth.
type ScreenEdgeTopVariant = 'standard' | 'compact';

// mediumBlurDepth adds a second gentle blur step across the upper half of the fade.
const mediumBlurDepth: number = 82;
// strongBlurDepth adds the final small blur increment nearest the status area.
const strongBlurDepth: number = 44;

// ScreenEdgeEffectsProps defines the shared material inputs for any edge-to-edge scroll surface.
type ScreenEdgeEffectsProps = {
  // blurTarget identifies the content captured by Expo's Android blur implementation.
  readonly blurTarget: RefObject<View | null>;
  // colors supplies the current Sorbet palette for both gradient fades.
  readonly colors: AppColors;
  // isDark selects the matching native blur material.
  readonly isDark: boolean;
  // materialOpacity optionally fades the complete top material without changing its geometry.
  readonly materialOpacity: Animated.Value | number;
  // topInset keeps the material continuous through the device status area.
  readonly topInset: number;
  // bottomInset keeps the lower fade continuous through the home-indicator area.
  readonly bottomInset: number;
  // bottomVariant keeps modal fades quieter than fades sitting behind persistent navigation.
  readonly bottomVariant?: ScreenEdgeBottomVariant;
  // topVariant reduces upper material depth where fixed icon navigation needs denser content placement.
  readonly topVariant?: ScreenEdgeTopVariant;
};

// ScreenEdgeEffects renders identical progressive top glass and gradient-only bottom fading.
export function ScreenEdgeEffects({
  blurTarget,
  colors,
  isDark,
  materialOpacity,
  topInset,
  bottomInset,
  bottomVariant = 'navigation',
  topVariant = 'standard',
}: ScreenEdgeEffectsProps): ReactElement {
  // topDepth selects the canonical material height for the current screen density.
  const topDepth: number =
    topVariant === 'compact'
      ? screenEdgeDepths.compactTop
      : screenEdgeDepths.top;
  // topHeight combines the device inset with the selected tint fade depth.
  const topHeight: number = topInset + topDepth;
  // mediumBlurHeight ends the middle blur layer before the transparent tint edge.
  const mediumBlurHeight: number = topInset + mediumBlurDepth;
  // strongBlurHeight confines the strongest accumulated blur to the status region.
  const strongBlurHeight: number = topInset + strongBlurDepth;
  // bottomDepth selects the amount of content covered by the current surface type.
  const bottomDepth: number =
    bottomVariant === 'modal'
      ? screenEdgeDepths.modalBottom
      : screenEdgeDepths.bottom;
  // bottomHeight combines the gesture inset with the selected gradient depth.
  const bottomHeight: number = bottomInset + bottomDepth;
  // bottomGradientColors avoids implying a persistent control surface inside modals.
  const bottomGradientColors: AppColors['edgeFadeBottomGradient'] =
    bottomVariant === 'modal'
      ? colors.modalEdgeFadeBottomGradient
      : colors.edgeFadeBottomGradient;

  return (
    <View pointerEvents="none" style={screenEdgeEffectStyles.fill}>
      <View
        style={[screenEdgeEffectStyles.topContainer, { height: topHeight }]}
      >
        <Animated.View
          style={[
            screenEdgeEffectStyles.topMaterial,
            { opacity: materialOpacity },
          ]}
        >
          <BlurView
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            intensity={2}
            style={[screenEdgeEffectStyles.topBlur, { height: topHeight }]}
            tint={isDark ? 'dark' : 'light'}
          />
          <BlurView
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            intensity={3}
            style={[
              screenEdgeEffectStyles.topBlur,
              { height: mediumBlurHeight },
            ]}
            tint={isDark ? 'dark' : 'light'}
          />
          <BlurView
            blurMethod="dimezisBlurViewSdk31Plus"
            blurTarget={blurTarget}
            intensity={4}
            style={[
              screenEdgeEffectStyles.topBlur,
              { height: strongBlurHeight },
            ]}
            tint={isDark ? 'dark' : 'light'}
          />
          <LinearGradient
            colors={colors.edgeFadeTopGradient}
            locations={[0, 0.28, 0.66, 1]}
            pointerEvents="none"
            style={screenEdgeEffectStyles.fill}
          />
        </Animated.View>
      </View>
      <LinearGradient
        colors={bottomGradientColors}
        locations={[0, 0.52, 1]}
        pointerEvents="none"
        style={[
          screenEdgeEffectStyles.bottomGradient,
          { height: bottomHeight },
        ]}
      />
    </View>
  );
}
