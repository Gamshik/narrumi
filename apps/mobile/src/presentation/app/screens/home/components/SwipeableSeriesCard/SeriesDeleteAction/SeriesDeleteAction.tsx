import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement } from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
  type WithSpringConfig,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import type { AppColors } from '@presentation/theme';

import { getSeriesDeleteActionPresentation } from '../seriesSwipeMotion';
import { styles } from './SeriesDeleteAction.styles';

// SeriesDeleteActionProps defines the destructive lane revealed by native card motion.
export type SeriesDeleteActionProps = {
  // colors supplies semantic Sorbet materials for the active theme.
  readonly colors: AppColors;
  // disabled prevents repeated confirmation requests during persistence.
  readonly disabled: boolean;
  // label identifies the series to assistive technology.
  readonly label: string;
  // progress tracks the native reveal from fully covered to fully open.
  readonly progress: SharedValue<number>;
  // width is the exact native snap distance and visible action geometry.
  readonly width: number;
  // onPress opens the existing confirmation flow.
  readonly onPress: () => void;
};

// actionPressSpring gives the icon bubble a short tactile compression without moving the lane.
const actionPressSpring: WithSpringConfig = {
  damping: 18,
  mass: 0.56,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
  stiffness: 340,
};

// SeriesDeleteAction renders a layered berry material rather than a separate red button.
export function SeriesDeleteAction({
  colors,
  disabled,
  label,
  progress,
  width,
  onPress,
}: SeriesDeleteActionProps): ReactElement {
  // pressProgress compresses only the visual core so the edge-to-edge geometry never gaps.
  const pressProgress = useSharedValue<number>(0);
  // haloMotionStyle creates the slowest internal layer for depth and parallax.
  const haloMotionStyle = useAnimatedStyle<ViewStyle>((): ViewStyle => {
    const presentation = getSeriesDeleteActionPresentation(progress.value);

    return {
      opacity: presentation.haloOpacity,
      transform: [
        { translateX: presentation.haloTranslateX },
        { scale: presentation.haloScale },
      ],
    };
  }, [progress]);
  // sheenMotionStyle sends one soft light front across the material during reveal.
  const sheenMotionStyle = useAnimatedStyle<ViewStyle>((): ViewStyle => {
    const presentation = getSeriesDeleteActionPresentation(progress.value);

    return {
      opacity: presentation.sheenOpacity,
      transform: [{ translateX: presentation.sheenTranslateX }],
    };
  }, [progress]);
  // orbRevealStyle inflates and unwinds the destructive icon after useful space exists.
  const orbRevealStyle = useAnimatedStyle<ViewStyle>((): ViewStyle => {
    const presentation = getSeriesDeleteActionPresentation(progress.value);

    return {
      opacity: presentation.orbOpacity,
      transform: [
        { translateX: presentation.orbTranslateX },
        { rotate: `${presentation.orbRotation}deg` },
        { scale: presentation.orbScale },
      ],
    };
  }, [progress]);
  // labelRevealStyle completes the sequence only near the stable open position.
  const labelRevealStyle = useAnimatedStyle<TextStyle>((): TextStyle => {
    const presentation = getSeriesDeleteActionPresentation(progress.value);

    return {
      opacity: presentation.labelOpacity,
      transform: [{ translateY: presentation.labelTranslateY }],
    };
  }, [progress]);
  // pressMotionStyle provides tactile depth while keeping the full action target stationary.
  const pressMotionStyle = useAnimatedStyle<ViewStyle>((): ViewStyle => ({
    transform: [
      { translateY: pressProgress.value * 2 },
      { scale: 1 - pressProgress.value * 0.08 },
    ],
  }));

  // handlePressIn compresses the visual core immediately when deletion is intentionally pressed.
  const handlePressIn = (
    // event is accepted to preserve the React Native press handler contract.
    _event: GestureResponderEvent,
  ): void => {
    pressProgress.value = withSpring(1, actionPressSpring);
  };

  // handlePressOut restores the visual core after activation or cancellation.
  const handlePressOut = (
    // event is accepted to preserve the React Native press handler contract.
    _event: GestureResponderEvent,
  ): void => {
    pressProgress.value = withSpring(0, actionPressSpring);
  };

  return (
    <View style={[styles.surface, { backgroundColor: colors.systemRed, width }]}>
      <Pressable
        accessibilityHint="Opens a confirmation before deleting the series"
        accessibilityLabel={`Delete ${label}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[colors.systemRed, colors.systemPink]}
          end={{ x: 1, y: 0.86 }}
          pointerEvents="none"
          start={{ x: 0, y: 0.1 }}
          style={styles.materialGradient}
        />
        <LinearGradient
          colors={['transparent', colors.systemRed]}
          end={{ x: 0.3, y: 1 }}
          pointerEvents="none"
          start={{ x: 0.6, y: 0 }}
          style={styles.depthGradient}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { backgroundColor: colors.systemPurple },
            haloMotionStyle,
          ]}
        >
          <View
            style={[
              styles.haloCore,
              { backgroundColor: colors.bubbleBorder },
            ]}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.sheen, sheenMotionStyle]}
        >
          <LinearGradient
            colors={[colors.bubbleBorder, 'transparent']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.sheenGradient}
          />
        </Animated.View>
        <Animated.View style={[styles.cluster, pressMotionStyle]}>
          <Animated.View
            style={[
              styles.orbShell,
              { shadowColor: colors.systemPink },
              orbRevealStyle,
            ]}
          >
            <View
              style={[styles.orb, { borderColor: colors.bubbleBorder }]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.orbFill,
                  { backgroundColor: colors.bubbleBorder },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.orbHighlight,
                  { backgroundColor: colors.bubbleBorder },
                ]}
              />
              <TrashIcon />
            </View>
          </Animated.View>
          <Animated.Text
            style={[
              styles.label,
              { textShadowColor: colors.systemRed },
              labelRevealStyle,
            ]}
          >
            DELETE
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// TrashIcon renders a rounded white glyph sized for the inflated action core.
function TrashIcon(): ReactElement {
  return (
    <Svg accessible={false} height={24} viewBox="0 0 32 32" width={24}>
      <Rect
        fill="none"
        height={15}
        rx={4}
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.6}
        width={15}
        x={8.5}
        y={12}
      />
      <Path
        d="M6.5 10h19"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth={2.8}
      />
      <Path
        d="M12 10V8c0-1.7 1.2-3 3-3h2c1.8 0 3 1.3 3 3v2"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
      />
      <Path
        d="M13 16v6.5M19 16v6.5"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeWidth={2.3}
      />
    </Svg>
  );
}
