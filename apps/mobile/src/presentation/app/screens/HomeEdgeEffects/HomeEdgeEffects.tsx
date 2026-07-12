import type { ReactElement, RefObject } from 'react';
import { Animated, Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import { ScreenEdgeEffects } from '../../shared';
import { homeEdgeEffectStyles } from './HomeEdgeEffects.styles';

// HomeEdgeEffectsProps combines shared screen material with Home's collapsing title state.
type HomeEdgeEffectsProps = {
  // blurTarget identifies the Home content captured by Expo's Android blur implementation.
  readonly blurTarget: RefObject<View | null>;
  // colors supplies the current Sorbet palette for shared edges and compact title.
  readonly colors: AppColors;
  // isDark selects the matching native blur material.
  readonly isDark: boolean;
  // materialOpacity softly fades the shared top material after the Home collapse threshold.
  readonly materialOpacity: Animated.Value;
  // topInset places the compact title below the status area.
  readonly topInset: number;
  // transitionProgress drives the autonomous large-to-compact title animation.
  readonly transitionProgress: Animated.Value;
  // title is the compact section name revealed after the large in-flow heading collapses.
  readonly title: string;
  // bottomInset keeps the shared lower fade continuous through the home indicator.
  readonly bottomInset: number;
};

// HomeEdgeEffects layers Home's compact title over the reusable screen edge material.
export function HomeEdgeEffects({
  blurTarget,
  colors,
  isDark,
  materialOpacity,
  topInset,
  bottomInset,
  transitionProgress,
  title,
}: HomeEdgeEffectsProps): ReactElement {
  // compactTitleOpacity begins near the end of the large title fade for a short soft overlap.
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
    <View pointerEvents="none" style={homeEdgeEffectStyles.fill}>
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
          homeEdgeEffectStyles.compactTitleContainer,
          {
            opacity: compactTitleOpacity,
            top: topInset + 17,
            transform: [{ translateY: compactTitleTranslateY }],
          },
        ]}
      >
        <Text
          style={[
            homeEdgeEffectStyles.compactTitle,
            { color: colors.labelPrimary, fontFamily: fontFamilies.display },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </View>
  );
}
