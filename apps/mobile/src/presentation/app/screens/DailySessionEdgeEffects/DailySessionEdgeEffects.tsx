import type { ReactElement, RefObject } from 'react';
import { Animated, Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import { BackIconButton, ScreenEdgeEffects } from '../../shared';
import { dailySessionEdgeEffectStyles } from './DailySessionEdgeEffects.styles';

// DailySessionEdgeEffectsProps combines shared edge material with setup exit navigation.
type DailySessionEdgeEffectsProps = {
  // blurTarget identifies the source view on platforms where progressive blur sampling is enabled.
  readonly blurTarget: RefObject<View | null>;
  // bottomInset keeps the quiet lower fade continuous through the home indicator.
  readonly bottomInset: number;
  // colors supplies the active Sorbet palette for glass and icon contrast.
  readonly colors: AppColors;
  // isDark selects the matching native blur tint.
  readonly isDark: boolean;
  // materialOpacity fades top glass in the same short phase as Home.
  readonly materialOpacity: Animated.Value;
  // onExit returns from episode setup to the owning series.
  readonly onExit: () => void;
  // topInset positions the icon below the device status area.
  readonly topInset: number;
  // title is the compact series name revealed after scrolling.
  readonly title: string;
  // titleTransitionProgress drives the compact title's late overlap with the large hero.
  readonly titleTransitionProgress: Animated.Value;
};

// DailySessionEdgeEffects renders fixed icon navigation over shared top and bottom fades.
export function DailySessionEdgeEffects({
  blurTarget,
  bottomInset,
  colors,
  isDark,
  materialOpacity,
  onExit,
  title,
  titleTransitionProgress,
  topInset,
}: DailySessionEdgeEffectsProps): ReactElement {
  // exitButtonTop aligns the 44-point target inside the strongest glass region.
  const exitButtonTop: number = topInset + 12;
  // compactTitleOpacity begins near the end of the large title fade, matching Home.
  const compactTitleOpacity: Animated.AnimatedInterpolation<number> =
    titleTransitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [0, 0, 1, 1],
      extrapolate: 'clamp',
    });
  // compactTitleTranslateY gives the compact title the same short settling motion as Home.
  const compactTitleTranslateY: Animated.AnimatedInterpolation<number> =
    titleTransitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [-4, -4, 0, 0],
      extrapolate: 'clamp',
    });

  return (
    <View pointerEvents="box-none" style={dailySessionEdgeEffectStyles.fill}>
      <ScreenEdgeEffects
        blurTarget={blurTarget}
        bottomInset={bottomInset}
        bottomVariant="modal"
        colors={colors}
        isDark={isDark}
        materialOpacity={materialOpacity}
        topInset={topInset}
        topVariant="compact"
      />
      <Animated.View
        pointerEvents="none"
        style={[
          dailySessionEdgeEffectStyles.compactTitleContainer,
          {
            opacity: compactTitleOpacity,
            top: exitButtonTop,
            transform: [{ translateY: compactTitleTranslateY }],
          },
        ]}
      >
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            dailySessionEdgeEffectStyles.compactTitle,
            { color: colors.labelPrimary, fontFamily: fontFamilies.display },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
      <BackIconButton
        accessibilityHint="Returns to the series screen"
        accessibilityLabel="Exit episode setup"
        colors={colors}
        onPress={onExit}
        style={[
          dailySessionEdgeEffectStyles.exitButton,
          { top: exitButtonTop },
        ]}
      />
    </View>
  );
}
