import type { ReactElement, RefObject } from 'react';
import { Animated, Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import { ScreenEdgeEffects } from '../ScreenEdgeEffects';
import { collapsingTitleEdgeEffectStyles } from './CollapsingTitleEdgeEffects.styles';

// CollapsingTitleEdgeEffectsProps combines shared material with a compact section title.
type CollapsingTitleEdgeEffectsProps = {
  // blurTarget identifies the source view on platforms where progressive blur sampling is enabled.
  readonly blurTarget: RefObject<View | null>;
  // bottomInset keeps the lower fade continuous through the home indicator.
  readonly bottomInset: number;
  // colors supplies the active Sorbet palette for shared edges and title text.
  readonly colors: AppColors;
  // isDark selects the matching native blur material.
  readonly isDark: boolean;
  // materialOpacity softly fades shared top material after the collapse threshold.
  readonly materialOpacity: Animated.Value;
  // title is the compact section name revealed after the large heading collapses.
  readonly title: string;
  // topInset places the compact title below the status area.
  readonly topInset: number;
  // transitionProgress drives the autonomous large-to-compact title animation.
  readonly transitionProgress: Animated.Value;
};

// CollapsingTitleEdgeEffects layers a compact title over reusable screen edge material.
export function CollapsingTitleEdgeEffects({
  blurTarget,
  bottomInset,
  colors,
  isDark,
  materialOpacity,
  title,
  topInset,
  transitionProgress,
}: CollapsingTitleEdgeEffectsProps): ReactElement {
  // compactTitleOpacity begins near the end of the large title fade for a short overlap.
  const compactTitleOpacity: Animated.AnimatedInterpolation<number> =
    transitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [0, 0, 1, 1],
      extrapolate: 'clamp',
    });
  // compactTitleTranslateY gives the collapsed title a short settling motion.
  const compactTitleTranslateY: Animated.AnimatedInterpolation<number> =
    transitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [-4, -4, 0, 0],
      extrapolate: 'clamp',
    });

  return (
    <View pointerEvents="none" style={collapsingTitleEdgeEffectStyles.fill}>
      <ScreenEdgeEffects
        blurTarget={blurTarget}
        bottomInset={bottomInset}
        colors={colors}
        isDark={isDark}
        materialOpacity={materialOpacity}
        topInset={topInset}
      />
      <Animated.View
        style={[
          collapsingTitleEdgeEffectStyles.compactTitleContainer,
          {
            opacity: compactTitleOpacity,
            top: topInset + 17,
            transform: [{ translateY: compactTitleTranslateY }],
          },
        ]}
      >
        <Text
          style={[
            collapsingTitleEdgeEffectStyles.compactTitle,
            { color: colors.labelPrimary, fontFamily: fontFamilies.display },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}
