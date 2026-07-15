import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { JellyPressable } from '@presentation/app/shared';
import type { AppColors } from '@presentation/theme';

import { dictionarySearchIconStyles as styles } from './DictionarySearchIcon.styles';

// DictionarySearchIconProps defines focus-driven bubble motion and tap behavior.
type DictionarySearchIconProps = {
  // colors supplies the active Sorbet material and droplet accents.
  readonly colors: AppColors;
  // isFocused controls the release and return direction of the small bubble.
  readonly isFocused: boolean;
  // onPress focuses the caller-owned text input when the icon is tapped.
  readonly onPress: () => void;
};

// DictionarySearchIcon turns search focus into a tactile Sorbet bubble interaction.
export function DictionarySearchIcon({
  colors,
  isFocused,
  onPress,
}: DictionarySearchIconProps): ReactElement {
  // deformation squashes the main bubble in opposite directions for focus and blur.
  const [deformation] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(0),
  );
  // focusProgress holds the halo and one-point lift while editing is active.
  const [focusProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(isFocused ? 1 : 0),
  );
  // satelliteProgress drives one detached droplet between invisible endpoints.
  const [satelliteProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // tapProgress replays a complete bubble burst on every direct icon press.
  const [tapProgress] = useState<Animated.Value>(
    (): Animated.Value => new Animated.Value(1),
  );
  // tapAnimationRef cancels an unfinished burst before a rapid repeated tap restarts it.
  const tapAnimationRef = useRef<Animated.CompositeAnimation | undefined>(
    undefined,
  );
  // reduceMotion mirrors the operating-system accessibility preference.
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect((): (() => void) => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(
      (isEnabled: boolean): void => {
        if (isMounted) {
          setReduceMotion(isEnabled);
        }
      },
    );

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled: boolean): void => setReduceMotion(isEnabled),
    );

    return (): void => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect((): (() => void) | undefined => {
    deformation.stopAnimation();
    focusProgress.stopAnimation();
    satelliteProgress.stopAnimation();

    if (reduceMotion) {
      deformation.setValue(0);
      focusProgress.setValue(isFocused ? 1 : 0);
      satelliteProgress.setValue(1);
      return undefined;
    }

    deformation.setValue(0);
    satelliteProgress.setValue(0);

    // focusAnimation keeps deformation brief while the halo settles and the droplet travels.
    const focusAnimation: Animated.CompositeAnimation = Animated.parallel([
      Animated.sequence([
        Animated.timing(deformation, {
          duration: 90,
          easing: Easing.out(Easing.cubic),
          toValue: isFocused ? 1 : -1,
          useNativeDriver: true,
        }),
        Animated.spring(deformation, {
          bounciness: 9,
          speed: 24,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(focusProgress, {
        bounciness: 4,
        speed: 24,
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(satelliteProgress, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);

    focusAnimation.start();
    return (): void => focusAnimation.stop();
  }, [
    deformation,
    focusProgress,
    isFocused,
    reduceMotion,
    satelliteProgress,
  ]);

  useEffect((): (() => void) => {
    return (): void => tapAnimationRef.current?.stop();
  }, []);

  // handlePressIn launches a short ring-and-droplet burst before focus changes on release.
  const handlePressIn = (): void => {
    tapAnimationRef.current?.stop();
    tapProgress.stopAnimation();

    if (reduceMotion) {
      tapProgress.setValue(1);
      return;
    }

    tapProgress.setValue(0);
    const tapAnimation: Animated.CompositeAnimation = Animated.sequence([
      Animated.timing(tapProgress, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 0.62,
        useNativeDriver: true,
      }),
      Animated.spring(tapProgress, {
        bounciness: 4,
        speed: 25,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);

    tapAnimationRef.current = tapAnimation;
    tapAnimation.start(({ finished }: { finished: boolean }): void => {
      if (finished && tapAnimationRef.current === tapAnimation) {
        tapAnimationRef.current = undefined;
      }
    });
  };

  // scaleX produces the horizontal half of the elastic squash.
  const scaleX: Animated.AnimatedInterpolation<number> = deformation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.08, 1, 0.92],
  });
  // scaleY counter-deforms the bubble so it keeps its soft volume.
  const scaleY: Animated.AnimatedInterpolation<number> = deformation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.92, 1, 1.08],
  });
  // rotation gives the asymmetric deformation a restrained wobble.
  const rotation: Animated.AnimatedInterpolation<string> = deformation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });
  // haloOpacity keeps a quiet active-focus signal after the droplet disappears.
  const haloOpacity: Animated.AnimatedInterpolation<number> = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.32],
  });
  // haloScale lets the active signal breathe beyond the main bubble edge.
  const haloScale: Animated.AnimatedInterpolation<number> = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.18],
  });
  // satelliteOpacity reveals only the middle portion of either route.
  const satelliteOpacity: Animated.AnimatedInterpolation<number> =
    satelliteProgress.interpolate({
      inputRange: [0, 0.16, 0.72, 1],
      outputRange: [0, 1, 0.82, 0],
    });
  // satelliteTranslateX reverses travel when blur pulls the droplet home.
  const satelliteTranslateX: Animated.AnimatedInterpolation<number> =
    satelliteProgress.interpolate({
      inputRange: [0, 1],
      outputRange: isFocused ? [1, 13] : [13, 1],
    });
  // satelliteTranslateY follows the same short diagonal in either direction.
  const satelliteTranslateY: Animated.AnimatedInterpolation<number> =
    satelliteProgress.interpolate({
      inputRange: [0, 1],
      outputRange: isFocused ? [1, -15] : [-15, 1],
    });
  // satelliteScale grows and dissolves the droplet without hard endpoints.
  const satelliteScale: Animated.AnimatedInterpolation<number> =
    satelliteProgress.interpolate({
      inputRange: [0, 0.3, 0.75, 1],
      outputRange: [0.24, 1, 0.78, 0.2],
    });
  // tapRingOpacity flashes the pressure wave only around the initial contact.
  const tapRingOpacity: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 0.1, 0.68, 1],
      outputRange: [0, 0.46, 0.18, 0],
      extrapolate: 'clamp',
    });
  // tapRingScale expands the pressure wave beyond the main icon bubble.
  const tapRingScale: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.68, 1.5],
      extrapolate: 'clamp',
    });
  // tapDropletOpacity keeps both tap droplets free from hard visible endpoints.
  const tapDropletOpacity: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 0.08, 0.7, 1],
      outputRange: [0, 1, 0.72, 0],
      extrapolate: 'clamp',
    });
  // tapDropletScale gives released droplets an elastic pop before they dissolve.
  const tapDropletScale: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 0.24, 0.72, 1],
      outputRange: [0.2, 1.08, 0.76, 0.12],
      extrapolate: 'clamp',
    });
  // tapDropletPrimaryX sends the brighter droplet toward the top-right corner.
  const tapDropletPrimaryX: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 14],
      extrapolate: 'clamp',
    });
  // tapDropletPrimaryY arcs the brighter droplet upward from the pressed surface.
  const tapDropletPrimaryY: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 0.48, 1],
      outputRange: [0, -11, -7],
      extrapolate: 'clamp',
    });
  // tapDropletSecondaryX balances the burst with a shorter lower-left route.
  const tapDropletSecondaryX: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10],
      extrapolate: 'clamp',
    });
  // tapDropletSecondaryY lets the smaller droplet settle below the icon center.
  const tapDropletSecondaryY: Animated.AnimatedInterpolation<number> =
    tapProgress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 8, 5],
      extrapolate: 'clamp',
    });
  // tapRotation adds a restrained wobble between the press compression and release.
  const tapRotation: Animated.AnimatedInterpolation<string> =
    tapProgress.interpolate({
      inputRange: [0, 0.3, 0.72, 1],
      outputRange: ['0deg', '-5deg', '3deg', '0deg'],
      extrapolate: 'clamp',
    });

  return (
    <JellyPressable
      accessibilityHint="Moves focus to the vocabulary search field"
      accessibilityLabel="Focus vocabulary search"
      accessibilityRole="button"
      containerStyle={styles.container}
      onPress={onPress}
      onPressIn={handlePressIn}
      scaleTo={0.9}
      style={styles.pressable}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tapRing,
            {
              borderColor: colors.systemTeal,
              opacity: tapRingOpacity,
              transform: [{ scale: tapRingScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tapDropletPrimary,
            {
              backgroundColor: colors.systemTeal,
              opacity: tapDropletOpacity,
              transform: [
                { translateX: tapDropletPrimaryX },
                { translateY: tapDropletPrimaryY },
                { scale: tapDropletScale },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tapDropletSecondary,
            {
              backgroundColor: colors.systemPink,
              opacity: tapDropletOpacity,
              transform: [
                { translateX: tapDropletSecondaryX },
                { translateY: tapDropletSecondaryY },
                { scale: tapDropletScale },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              backgroundColor: colors.badgeAccentSurface,
              borderColor: colors.systemPurple,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.satellite,
            {
              opacity: satelliteOpacity,
              transform: [
                { translateX: satelliteTranslateX },
                { translateY: satelliteTranslateY },
                { scale: satelliteScale },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.systemPurple, colors.systemTeal]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.material}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.mainBubble,
            {
              borderColor: colors.pillBorder,
              transform: [
                { translateY: Animated.multiply(focusProgress, -1) },
                { rotate: rotation },
                { rotate: tapRotation },
                { scaleX },
                { scaleY },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.badgeAccentSurface, colors.pillSelectedSurface]}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={styles.material}
          />
          <Svg
            accessibilityElementsHidden
            height={20}
            pointerEvents="none"
            viewBox="0 0 24 24"
            width={20}
          >
            <Circle
              cx={10.5}
              cy={10.5}
              fill="none"
              r={5.5}
              stroke={colors.systemPurple}
              strokeWidth={2.2}
            />
            <Path
              d="m15 15 4.2 4.2"
              fill="none"
              stroke={colors.systemPurple}
              strokeLinecap="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Animated.View>
      </View>
    </JellyPressable>
  );
}
