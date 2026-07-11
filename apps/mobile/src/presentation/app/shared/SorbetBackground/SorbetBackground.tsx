import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScaledSize,
} from 'react-native';

import type { AppColors } from '@presentation/theme/tokens';

import { startSequentialCollisionLoop } from './collisionMotion';

// SorbetBackgroundProps carries the active theme colors into the backdrop.
type SorbetBackgroundProps = {
  // colors provides the gradient stops and floating bubble tints for the theme.
  readonly colors: AppColors;
};

// SorbetBackground renders a deep atmospheric canvas with slow decorative drift.
export function SorbetBackground({
  colors,
}: SorbetBackgroundProps): ReactElement {
  // viewport keeps the collision point responsive without moving bubbles through content.
  const viewport: ScaledSize = useWindowDimensions();
  // collisionPoint is the shared edge where the two upper bubbles make contact.
  const collisionPoint: number = Math.min(
    228,
    Math.max(176, viewport.width * 0.48),
  );
  // smallOrbRestLeft caps travel distance on tablets and wide web layouts.
  const smallOrbRestLeft: number = Math.min(
    286,
    Math.max(160, viewport.width - 128),
  );
  // largeCollisionX moves the large bubble's right edge to the contact point.
  const largeCollisionX: number = collisionPoint - 148;
  // smallCollisionX moves the small bubble's left edge to the same contact point.
  const smallCollisionX: number = collisionPoint - smallOrbRestLeft;
  // pinkOrbRestLeft keeps the middle right bubble near the viewport edge.
  const pinkOrbRestLeft: number = Math.min(
    330,
    Math.max(220, viewport.width - 100),
  );
  // amberOrbRestLeft places the smaller middle bubble one short gap to the left.
  const amberOrbRestLeft: number = pinkOrbRestLeft - 100;
  // middlePairGap measures the exact horizontal air gap between the middle circles.
  const middlePairGap: number = pinkOrbRestLeft - (amberOrbRestLeft + 58);
  // middleLeftCollisionX moves the amber bubble to the shared contact edge.
  const middleLeftCollisionX: number = middlePairGap / 2;
  // middleRightCollisionX moves the pink bubble to the same contact edge.
  const middleRightCollisionX: number = -middlePairGap / 2;
  // tealOrbRestLeft keeps the bottom pair responsive on narrow screens.
  const tealOrbRestLeft: number = Math.max(
    0,
    Math.min(72, viewport.width - 318),
  );
  // mintOrbRestLeft caps the bottom-right bubble travel distance on wide screens.
  const mintOrbRestLeft: number = Math.min(
    304,
    Math.max(234, viewport.width - 86),
  );
  // bottomPairGap measures the exact horizontal air gap between the bottom circles.
  const bottomPairGap: number = mintOrbRestLeft - (tealOrbRestLeft + 192);
  // bottomLeftCollisionX moves the teal bubble to the bottom contact edge.
  const bottomLeftCollisionX: number = bottomPairGap / 2;
  // bottomRightCollisionX moves the mint bubble to the same contact edge.
  const bottomRightCollisionX: number = -bottomPairGap / 2;
  // primaryDrift and secondaryDrift keep bubble groups out of mechanical sync.
  const [primaryDrift] = useState<Animated.Value>(
    () => new Animated.Value(0),
  );
  const [secondaryDrift] = useState<Animated.Value>(
    () => new Animated.Value(0),
  );
  // collisionPhase synchronizes approach, compression, and rebound for the upper pair.
  const [collisionPhase] = useState<Animated.Value>(
    () => new Animated.Value(0),
  );
  // middleCollisionPhase drives the independently randomized middle pair.
  const [middleCollisionPhase] = useState<Animated.Value>(
    () => new Animated.Value(0),
  );
  // bottomCollisionPhase drives the independently randomized bottom pair.
  const [bottomCollisionPhase] = useState<Animated.Value>(
    () => new Animated.Value(0),
  );
  // reduceMotion mirrors the operating-system accessibility preference.
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect((): (() => void) => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled): void => {
      if (isMounted) {
        setReduceMotion(isEnabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return (): void => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect((): (() => void) | undefined => {
    if (reduceMotion) {
      primaryDrift.stopAnimation();
      secondaryDrift.stopAnimation();
      primaryDrift.setValue(0.35);
      secondaryDrift.setValue(0.62);

      return undefined;
    }

    // Long asymmetric cycles keep the background alive without tracking attention.
    const primaryAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(primaryDrift, {
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(primaryDrift, {
          duration: 22000,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const secondaryAnimation: Animated.CompositeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(secondaryDrift, {
          duration: 26000,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(secondaryDrift, {
          duration: 20000,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    primaryAnimation.start();
    secondaryAnimation.start();

    return (): void => {
      primaryAnimation.stop();
      secondaryAnimation.stop();
    };
  }, [primaryDrift, reduceMotion, secondaryDrift]);

  useEffect((): (() => void) | undefined => {
    if (reduceMotion) {
      bottomCollisionPhase.stopAnimation();
      collisionPhase.stopAnimation();
      middleCollisionPhase.stopAnimation();
      bottomCollisionPhase.setValue(0.14);
      collisionPhase.setValue(0.18);
      middleCollisionPhase.setValue(0.1);

      return undefined;
    }

    // One scheduler completes a full rest-to-rest cycle before choosing again.
    const stopCollisions: () => void = startSequentialCollisionLoop({
      initialDelay: 1200,
      phases: [collisionPhase, middleCollisionPhase, bottomCollisionPhase],
    });

    return (): void => {
      stopCollisions();
    };
  }, [
    bottomCollisionPhase,
    collisionPhase,
    middleCollisionPhase,
    reduceMotion,
  ]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors.backgroundGradient}
        end={{ x: 0.88, y: 1 }}
        start={{ x: 0.08, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.ambientVeil,
          {
            opacity: secondaryDrift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.2],
            }),
            transform: [
              { rotate: '-14deg' },
              {
                translateX: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, 18],
                }),
              },
              {
                translateY: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, -14],
                }),
              },
              {
                scale: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1.04],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[
            `${colors.systemBlue}00`,
            `${colors.systemPurple}42`,
            `${colors.systemPink}00`,
          ]}
          end={{ x: 0.55, y: 1 }}
          start={{ x: 0.45, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbLarge,
          {
            shadowColor: colors.systemPurple,
            transform: [
              {
                translateX: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 12],
                }),
              },
              {
                translateX: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [0, largeCollisionX, largeCollisionX + 14],
                }),
              },
              {
                translateY: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-9, 15],
                }),
              },
              {
                scaleX: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.88],
                }),
              },
              {
                scaleY: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.08],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemPurple}70`, `${colors.systemBlue}18`]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowLarge,
            {
              opacity: collisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.58],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbPink,
          {
            left: pinkOrbRestLeft,
            shadowColor: colors.systemPink,
            transform: [
              {
                translateX: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, -10],
                }),
              },
              {
                translateX: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [
                    0,
                    middleRightCollisionX,
                    middleRightCollisionX - 9,
                  ],
                }),
              },
              {
                translateY: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 16],
                }),
              },
              {
                scaleX: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.92],
                }),
              },
              {
                scaleY: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.05],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemPink}58`, `${colors.systemOrange}18`]}
          end={{ x: 0.2, y: 1 }}
          start={{ x: 0.8, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowSmall,
            {
              opacity: middleCollisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.52],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbTeal,
          {
            left: tealOrbRestLeft,
            shadowColor: colors.systemTeal,
            transform: [
              {
                translateX: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-9, 15],
                }),
              },
              {
                translateX: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [
                    0,
                    bottomLeftCollisionX,
                    bottomLeftCollisionX + 12,
                  ],
                }),
              },
              {
                translateY: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -10],
                }),
              },
              {
                scaleX: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.91],
                }),
              },
              {
                scaleY: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.055],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemTeal}54`, `${colors.systemGreen}16`]}
          end={{ x: 1, y: 0.9 }}
          start={{ x: 0, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowLarge,
            {
              opacity: bottomCollisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.5],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbSmall,
          {
            left: smallOrbRestLeft,
            shadowColor: colors.systemPurple,
            transform: [
              {
                translateX: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 12],
                }),
              },
              {
                translateX: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [0, smallCollisionX, smallCollisionX - 14],
                }),
              },
              {
                translateY: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 14],
                }),
              },
              {
                scaleX: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.78],
                }),
              },
              {
                scaleY: collisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.14],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemPurple}48`, `${colors.systemPink}12`]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowSmall,
            {
              opacity: collisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.64],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbAmber,
          {
            left: amberOrbRestLeft,
            shadowColor: colors.systemOrange,
            transform: [
              {
                translateX: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, -10],
                }),
              },
              {
                translateX: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [
                    0,
                    middleLeftCollisionX,
                    middleLeftCollisionX + 9,
                  ],
                }),
              },
              {
                translateY: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 16],
                }),
              },
              {
                scaleX: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.82],
                }),
              },
              {
                scaleY: middleCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.12],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemOrange}42`, `${colors.systemPink}12`]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowLarge,
            {
              opacity: middleCollisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.6],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          styles.orbMint,
          {
            left: mintOrbRestLeft,
            shadowColor: colors.systemGreen,
            transform: [
              {
                translateX: secondaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 14],
                }),
              },
              {
                translateX: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [
                    0,
                    bottomRightCollisionX,
                    bottomRightCollisionX - 12,
                  ],
                }),
              },
              {
                translateY: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -10],
                }),
              },
              {
                scaleX: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 0.8],
                }),
              },
              {
                scaleY: bottomCollisionPhase.interpolate({
                  inputRange: [0, 0.86, 1],
                  outputRange: [1, 1, 1.13],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${colors.systemGreen}38`, `${colors.systemTeal}12`]}
          end={{ x: 0.2, y: 1 }}
          start={{ x: 0.8, y: 0 }}
          style={styles.orbFill}
        />
        <View style={styles.orbHighlight} />
        <Animated.View
          style={[
            styles.impactGlow,
            styles.impactGlowSmall,
            {
              opacity: bottomCollisionPhase.interpolate({
                inputRange: [0, 0.86, 1],
                outputRange: [0, 0, 0.62],
              }),
            },
          ]}
        />
        <View style={styles.orbShade} />
      </Animated.View>

      <Animated.View
        style={[
          styles.haloRing,
          {
            borderColor: `${colors.systemTeal}28`,
            opacity: primaryDrift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.32, 0.48],
            }),
            transform: [
              {
                translateY: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -12],
                }),
              },
              {
                scale: primaryDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.04],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.haloInner,
            { borderColor: `${colors.systemPurple}20` },
          ]}
        />
      </Animated.View>
    </View>
  );
}

// styles keep bubbles dimensional while motion stays transform-only and cheap.
const styles = StyleSheet.create({
  ambientVeil: {
    borderRadius: 999,
    height: 520,
    overflow: 'hidden',
    position: 'absolute',
    right: -176,
    top: 76,
    width: 286,
  },
  haloInner: {
    borderRadius: 999,
    borderWidth: 1,
    bottom: 22,
    left: 22,
    position: 'absolute',
    right: 22,
    top: 22,
  },
  haloRing: {
    borderRadius: 999,
    borderWidth: 1,
    bottom: 76,
    height: 236,
    position: 'absolute',
    right: -154,
    width: 236,
  },
  impactGlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
    borderRadius: 999,
    height: '70%',
    position: 'absolute',
    top: '15%',
    width: 32,
  },
  impactGlowLarge: {
    right: -14,
  },
  impactGlowSmall: {
    left: -14,
  },
  orb: {
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    elevation: 1,
    overflow: 'hidden',
    position: 'absolute',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
  },
  orbFill: {
    bottom: 0,
    borderRadius: 999,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  orbHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    height: '32%',
    left: '18%',
    opacity: 0.42,
    position: 'absolute',
    top: '11%',
    transform: [{ rotate: '-18deg' }],
    width: '44%',
  },
  orbShade: {
    backgroundColor: 'rgba(21, 8, 43, 0.11)',
    borderRadius: 999,
    bottom: -24,
    height: '48%',
    position: 'absolute',
    right: -14,
    transform: [{ rotate: '12deg' }],
    width: '72%',
  },
  orbLarge: {
    borderRadius: 110,
    height: 220,
    left: -72,
    top: -62,
    width: 220,
  },
  orbAmber: {
    borderRadius: 29,
    height: 58,
    top: 237,
    width: 58,
  },
  orbMint: {
    borderRadius: 34,
    bottom: 14,
    height: 68,
    width: 68,
  },
  orbPink: {
    borderRadius: 74,
    height: 148,
    top: 192,
    width: 148,
  },
  orbSmall: {
    borderRadius: 46,
    height: 92,
    top: 2,
    width: 92,
  },
  orbTeal: {
    borderRadius: 96,
    bottom: -48,
    height: 192,
    width: 192,
  },
});
