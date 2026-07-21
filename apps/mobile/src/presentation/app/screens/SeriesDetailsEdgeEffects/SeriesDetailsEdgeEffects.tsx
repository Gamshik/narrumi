import type { ReactElement, RefObject } from 'react';
import { Animated, Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import {
  BackIconButton,
  JellyPressable,
  ScreenEdgeEffects,
} from '../../shared';
import type { AppStyles } from '../../types';
import { seriesDetailsEdgeEffectStyles } from './SeriesDetailsEdgeEffects.styles';

// SeriesDetailsEdgeEffectsProps combines shared edge material with series navigation chrome.
type SeriesDetailsEdgeEffectsProps = {
  // blurTarget identifies the source view on platforms where progressive blur sampling is enabled.
  readonly blurTarget: RefObject<View | null>;
  // bottomInset keeps the quiet lower fade continuous through the home-indicator area.
  readonly bottomInset: number;
  // canEditSetup changes the setup action label and its visual emphasis.
  readonly canEditSetup: boolean;
  // colors supplies the active Sorbet palette for material and text.
  readonly colors: AppColors;
  // isDark selects the matching native blur tint.
  readonly isDark: boolean;
  // onBack returns to the previous screen.
  readonly onBack: () => void;
  // onOpenSetup opens the editable or read-only series setup modal.
  readonly onOpenSetup: () => void;
  // styles supplies existing shared button treatments.
  readonly styles: AppStyles;
  // title is the compact series name revealed between the persistent controls.
  readonly title: string;
  // topInset positions navigation below the device status area.
  readonly topInset: number;
  // transitionProgress reveals glass and the compact title after the large title enters the material.
  readonly transitionProgress: Animated.Value;
};

// SeriesDetailsEdgeEffects keeps controls fixed while only the compact title responds to scroll state.
export function SeriesDetailsEdgeEffects({
  blurTarget,
  bottomInset,
  canEditSetup,
  colors,
  isDark,
  onBack,
  onOpenSetup,
  styles,
  title,
  topInset,
  transitionProgress,
}: SeriesDetailsEdgeEffectsProps): ReactElement {
  // compactTitleOpacity starts immediately after the large title reaches the blurred edge.
  const compactTitleOpacity: Animated.AnimatedInterpolation<number> =
    transitionProgress.interpolate({
      inputRange: [0, 0.12, 1],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    });
  // controlsTop aligns both actions and the compact title inside one stable navigation row.
  const controlsTop: number = topInset + 12;

  return (
    <View pointerEvents="box-none" style={seriesDetailsEdgeEffectStyles.fill}>
      <ScreenEdgeEffects
        blurTarget={blurTarget}
        bottomInset={bottomInset}
        bottomVariant="modal"
        colors={colors}
        isDark={isDark}
        materialOpacity={transitionProgress}
        topInset={topInset}
        topVariant="compact"
      />
      <View
        pointerEvents="box-none"
        style={[seriesDetailsEdgeEffectStyles.controls, { top: controlsTop }]}
      >
        <BackIconButton
          accessibilityHint="Returns to the stories list"
          accessibilityLabel="Back to stories"
          colors={colors}
          onPress={onBack}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            seriesDetailsEdgeEffectStyles.compactTitleContainer,
            { opacity: compactTitleOpacity },
          ]}
        >
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[
              seriesDetailsEdgeEffectStyles.compactTitle,
              { color: colors.labelPrimary, fontFamily: fontFamilies.display },
            ]}
          >
            {title}
          </Text>
        </Animated.View>
        <JellyPressable
          onPress={onOpenSetup}
          style={[
            styles.secondarySmallButton,
            !canEditSetup && styles.disabledControl,
          ]}
        >
          <Text style={styles.secondarySmallButtonText}>
            {canEditSetup ? 'Setup' : 'View Setup'}
          </Text>
        </JellyPressable>
      </View>
    </View>
  );
}
