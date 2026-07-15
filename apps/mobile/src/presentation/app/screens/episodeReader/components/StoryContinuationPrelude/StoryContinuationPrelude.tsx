import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Text,
  View,
} from 'react-native';

import { darkColors, lightColors } from '@presentation/theme';
import type { AppColors } from '@presentation/theme';
import { useReducedMotionPreference } from '@presentation/app/shared';
import { useAppTheme } from '@presentation/app/theme';

import {
  createStoryContinuationPreludeStyles,
  type StoryContinuationPreludeStyles,
} from './StoryContinuationPrelude.styles';

// TRACK_GLOW_WIDTH matches the fixed traveling-light geometry in the local styles.
const TRACK_GLOW_WIDTH: number = 56;
// ENTRANCE_DURATION_MS keeps the prelude arrival visible without delaying the request.
const ENTRANCE_DURATION_MS: number = 320;
// SWEEP_DURATION_MS gives the narrative thread a slow, non-mechanical cadence.
const SWEEP_DURATION_MS: number = 2200;
// BREATH_DURATION_MS keeps the future-text traces calmer than a conventional spinner.
const BREATH_DURATION_MS: number = 1200;

// StoryContinuationPrelude renders a compact atmospheric cue while the next story beat is generated.
export function StoryContinuationPrelude(): ReactElement {
  const { isDark } = useAppTheme();
  const reduceMotion: boolean = useReducedMotionPreference();
  // colors keeps all light, dark, and accent decisions on the shared semantic palette.
  const colors: AppColors = isDark ? darkColors : lightColors;
  // styles contains only the local geometry and themed material for this prelude.
  const styles: StoryContinuationPreludeStyles = useMemo(
    (): StoryContinuationPreludeStyles =>
      createStoryContinuationPreludeStyles(colors),
    [colors],
  );
  // entranceProgress controls the one-time local reveal below the saved choice.
  const [entranceProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // sweepProgress moves one light along the narrative thread.
  const [sweepProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // breathProgress softly alternates the active dot and future-text traces.
  const [breathProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // trackWidth provides a responsive travel distance without hardcoding screen width.
  const [trackWidth, setTrackWidth] = useState<number>(0);

  useEffect((): (() => void) => {
    entranceProgress.stopAnimation();
    sweepProgress.stopAnimation();
    breathProgress.stopAnimation();

    if (reduceMotion) {
      entranceProgress.setValue(1);
      sweepProgress.setValue(0.5);
      breathProgress.setValue(0.5);

      return (): void => undefined;
    }

    entranceProgress.setValue(0);
    sweepProgress.setValue(0);
    breathProgress.setValue(0);

    // entranceAnimation connects the optimistic answer to the waiting state in one soft beat.
    const entranceAnimation: Animated.CompositeAnimation = Animated.timing(
      entranceProgress,
      {
        duration: ENTRANCE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      },
    );
    // sweepAnimation carries a single asymmetric light pass across the story thread.
    const sweepAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(sweepProgress, {
          duration: SWEEP_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.delay(260),
        Animated.timing(sweepProgress, {
          duration: 1,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    // breathAnimation makes the traces feel alive without suggesting determinate progress.
    const breathAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathProgress, {
          duration: BREATH_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(breathProgress, {
          duration: BREATH_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    entranceAnimation.start();
    sweepAnimation.start();
    breathAnimation.start();

    return (): void => {
      entranceAnimation.stop();
      sweepAnimation.stop();
      breathAnimation.stop();
    };
  }, [breathProgress, entranceProgress, reduceMotion, sweepProgress]);

  // entranceTranslateY lets the cue settle into the reading flow instead of popping in place.
  const entranceTranslateY: Animated.AnimatedInterpolation<number> =
    entranceProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [5, 0],
    });
  // entranceScale adds a nearly imperceptible material expansion on arrival.
  const entranceScale: Animated.AnimatedInterpolation<number> =
    entranceProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.985, 1],
    });
  // sweepTranslateX spans the measured thread and starts fully outside its clipped edge.
  const sweepTranslateX: Animated.AnimatedInterpolation<number> =
    sweepProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [-TRACK_GLOW_WIDTH, trackWidth + TRACK_GLOW_WIDTH],
    });
  // pulseOpacity keeps the active point quiet at both ends of its breathing cycle.
  const pulseOpacity: Animated.AnimatedInterpolation<number> =
    breathProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.38, 0.78],
    });
  // pulseScale creates a soft halo expansion around the fixed center point.
  const pulseScale: Animated.AnimatedInterpolation<number> =
    breathProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.82, 1.16],
    });
  // primaryTraceOpacity leads the staggered future-text breathing sequence.
  const primaryTraceOpacity: Animated.AnimatedInterpolation<number> =
    breathProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.48, 0.9],
    });
  // secondaryTraceOpacity follows at inverse intensity to avoid synchronized blinking.
  const secondaryTraceOpacity: Animated.AnimatedInterpolation<number> =
    breathProgress.interpolate({
      extrapolate: 'clamp',
      inputRange: [0, 1],
      outputRange: [0.72, 0.34],
    });

  // handleTrackLayout keeps the light pass bounded to the available reader width.
  const handleTrackLayout = (event: LayoutChangeEvent): void => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <Animated.View
      accessible
      accessibilityLabel="Generating the next story scene"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityValue={{ text: 'Your choice is shaping the next scene' }}
      style={[
        styles.container,
        {
          opacity: entranceProgress,
          transform: [
            { translateY: entranceTranslateY },
            { scale: entranceScale },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.pulse}>
          <Animated.View
            style={[
              styles.pulseHalo,
              { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
            ]}
          />
          <View style={styles.pulseCore} />
        </View>
        <Text style={styles.label}>Next scene</Text>
      </View>

      <Text style={styles.message}>
        Your choice is shaping what happens next…
      </Text>

      <View onLayout={handleTrackLayout} style={styles.track}>
        <View style={styles.trackBase} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.trackGlow,
            { transform: [{ translateX: sweepTranslateX }] },
          ]}
        >
          <LinearGradient
            colors={[
              `${colors.systemPurple}00`,
              `${colors.systemPurple}70`,
              `${colors.systemTeal}b8`,
              `${colors.systemTeal}00`,
            ]}
            end={{ x: 1, y: 0.5 }}
            locations={[0, 0.32, 0.68, 1]}
            start={{ x: 0, y: 0.5 }}
            style={styles.trackGlowGradient}
          />
        </Animated.View>
      </View>

      <View style={styles.draft}>
        <Animated.View
          style={[
            styles.draftLine,
            styles.draftLineLong,
            { opacity: primaryTraceOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.draftLine,
            styles.draftLineMedium,
            { opacity: secondaryTraceOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.draftLine,
            styles.draftLineShort,
            { opacity: primaryTraceOpacity },
          ]}
        />
      </View>
    </Animated.View>
  );
}
