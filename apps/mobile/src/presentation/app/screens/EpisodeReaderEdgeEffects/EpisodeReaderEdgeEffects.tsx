import type { ReactElement, RefObject } from 'react';
import { Animated, Text, View } from 'react-native';

import { fontFamilies, type AppColors } from '@presentation/theme';

import { BackIconButton, ScreenEdgeEffects } from '../../shared';
import { episodeReaderEdgeEffectStyles } from './EpisodeReaderEdgeEffects.styles';

// EpisodeReaderEdgeEffectsProps combines shared material with fixed Reader orientation controls.
type EpisodeReaderEdgeEffectsProps = {
  // blurTarget identifies the Reader scroll content captured on Android.
  readonly blurTarget: RefObject<View | null>;
  // bottomInset keeps the lower fade continuous through the home indicator.
  readonly bottomInset: number;
  // colors supplies the active Sorbet palette for glass and metadata contrast.
  readonly colors: AppColors;
  // episodeNumber is the focused episode order shown above the compact title.
  readonly episodeNumber?: number;
  // isDark selects the matching native blur tint.
  readonly isDark: boolean;
  // materialOpacity fades top glass in the same short phase as Home.
  readonly materialOpacity: Animated.Value;
  // onExit returns to the owning series when navigation is available.
  readonly onExit?: () => void;
  // title is the focused episode name shown for either reader mode.
  readonly title?: string;
  // topInset positions fixed controls below the device status area.
  readonly topInset: number;
  // transitionProgress drives the compact metadata's late overlap with the large title.
  readonly transitionProgress: Animated.Value;
};

// EpisodeReaderEdgeEffects renders fixed controls and focused metadata over shared edge fades.
export function EpisodeReaderEdgeEffects({
  blurTarget,
  bottomInset,
  colors,
  episodeNumber,
  isDark,
  materialOpacity,
  onExit,
  title,
  topInset,
  transitionProgress,
}: EpisodeReaderEdgeEffectsProps): ReactElement {
  // controlTop aligns both 44-point side targets inside the strongest glass region.
  const controlTop: number = topInset + 12;
  // compactMetadataOpacity begins near the end of the large title fade, matching Home.
  const compactMetadataOpacity: Animated.AnimatedInterpolation<number> =
    transitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [0, 0, 1, 1],
      extrapolate: 'clamp',
    });
  // compactMetadataTranslateY gives both metadata lines one restrained settling motion.
  const compactMetadataTranslateY: Animated.AnimatedInterpolation<number> =
    transitionProgress.interpolate({
      inputRange: [0, 0.5, 0.82, 1],
      outputRange: [-4, -4, 0, 0],
      extrapolate: 'clamp',
    });
  // hasFocusedMetadata waits until both parts of the focused episode context are available.
  const hasFocusedMetadata: boolean =
    episodeNumber !== undefined && title !== undefined;

  return (
    <View pointerEvents="box-none" style={episodeReaderEdgeEffectStyles.fill}>
      <ScreenEdgeEffects
        blurTarget={blurTarget}
        bottomInset={bottomInset}
        bottomVariant="modal"
        colors={colors}
        isDark={isDark}
        materialOpacity={materialOpacity}
        topInset={topInset}
        topVariant="reader"
      />
      {hasFocusedMetadata ? (
        <Animated.View
          pointerEvents="none"
          style={[
            episodeReaderEdgeEffectStyles.compactMetadataContainer,
            {
              opacity: compactMetadataOpacity,
              top: controlTop,
              transform: [{ translateY: compactMetadataTranslateY }],
            },
          ]}
        >
          <Text
            style={[
              episodeReaderEdgeEffectStyles.compactEpisodeNumber,
              {
                color: colors.systemPurple,
                fontFamily: fontFamilies.bodyHeavy,
              },
            ]}
          >
            EPISODE {episodeNumber}
          </Text>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[
              episodeReaderEdgeEffectStyles.compactTitle,
              {
                color: colors.labelPrimary,
                fontFamily: fontFamilies.display,
              },
            ]}
          >
            {title}
          </Text>
        </Animated.View>
      ) : null}
      {onExit ? (
        <BackIconButton
          accessibilityHint="Returns to the series screen"
          accessibilityLabel="Back to series"
          colors={colors}
          onPress={onExit}
          style={[
            episodeReaderEdgeEffectStyles.backButton,
            { top: controlTop },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          episodeReaderEdgeEffectStyles.aiContainer,
          { top: controlTop },
        ]}
      >
        <Text
          style={[
            episodeReaderEdgeEffectStyles.aiBadge,
            {
              backgroundColor: `${colors.systemPurple}2b`,
              color: colors.systemPurple,
            },
          ]}
        >
          AI
        </Text>
      </View>
    </View>
  );
}
