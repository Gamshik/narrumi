import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  type LayoutChangeEvent,
} from 'react-native';

import { getActiveIndicatorOffset } from './sorbetTabBarMotion';

// ActiveTabLensMotion is the native-driven state consumed by the visual selection lens.
type ActiveTabLensMotion = {
  // barWidth reveals the indicator only after responsive geometry is known.
  readonly barWidth: number;
  // handleBarLayout updates lens geometry when the dock changes width.
  readonly handleBarLayout: (event: LayoutChangeEvent) => void;
  // indicatorScale lets the bubble swell uniformly without creating flat side cuts.
  readonly indicatorScale: Animated.AnimatedInterpolation<number>;
  // indicatorX moves the bubble between equal-width destination centers.
  readonly indicatorX: Animated.Value;
  // rippleBloomOpacity fades the refracted wash behind the expanding wavefront.
  readonly rippleBloomOpacity: Animated.AnimatedInterpolation<number>;
  // rippleBloomScale spreads the soft wash across the glass capsule.
  readonly rippleBloomScale: Animated.AnimatedInterpolation<number>;
  // rippleEchoOpacity delays the secondary ring so the touch has a liquid aftershock.
  readonly rippleEchoOpacity: Animated.AnimatedInterpolation<number>;
  // rippleEchoScale expands the secondary ring beyond the primary wavefront.
  readonly rippleEchoScale: Animated.AnimatedInterpolation<number>;
  // rippleFrontOpacity keeps the main touch ring legible through the middle of its travel.
  readonly rippleFrontOpacity: Animated.AnimatedInterpolation<number>;
  // rippleFrontScale grows the main touch ring across more than one destination.
  readonly rippleFrontScale: Animated.AnimatedInterpolation<number>;
  // rippleX anchors every ripple layer at the pressed destination.
  readonly rippleX: Animated.Value;
  // trailOpacity reveals the delayed droplet only while the lens is moving.
  readonly trailOpacity: Animated.AnimatedInterpolation<number>;
  // trailScale lets the delayed droplet form and dissolve cleanly.
  readonly trailScale: Animated.AnimatedInterpolation<number>;
  // trailX follows the lens with a softer, slower spring.
  readonly trailX: Animated.Value;
  // triggerPressRipple starts immediate feedback even when the focused destination is pressed again.
  readonly triggerPressRipple: (pressedIndex: number) => void;
};

// ActiveTabLensMotionOptions defines the navigation inputs that can change lens movement.
type ActiveTabLensMotionOptions = {
  // activeIndex is the navigator-owned focused destination.
  readonly activeIndex: number;
  // reduceMotion turns animated travel into immediate positioning.
  readonly reduceMotion: boolean;
  // routeCount controls equal-width destination geometry.
  readonly routeCount: number;
};

// useActiveTabLensMotion owns responsive positioning and the liquid stretch transition.
export function useActiveTabLensMotion({
  activeIndex,
  reduceMotion,
  routeCount,
}: ActiveTabLensMotionOptions): ActiveTabLensMotion {
  // barWidth tracks the measured capsule so the indicator remains centered on tablets and web.
  const [barWidth, setBarWidth] = useState<number>(0);
  // indicatorX owns the native-driven horizontal movement of the active bubble.
  const [indicatorX] = useState((): Animated.Value => new Animated.Value(0));
  // indicatorPulse briefly swells the bubble while preserving a circular silhouette.
  const [indicatorPulse] = useState(
    (): Animated.Value => new Animated.Value(0),
  );
  // trailX begins at the selected lens and deliberately follows with a slower spring.
  const [trailX] = useState((): Animated.Value => new Animated.Value(0));
  // trailProgress controls one form-and-dissolve cycle for the delayed droplet.
  const [trailProgress] = useState(
    (): Animated.Value => new Animated.Value(0),
  );
  // rippleX anchors the touch wave directly beneath the pressed destination.
  const [rippleX] = useState((): Animated.Value => new Animated.Value(0));
  // rippleProgress drives the bloom, wavefront, and delayed echo as one coherent event.
  const [rippleProgress] = useState(
    (): Animated.Value => new Animated.Value(0),
  );
  // rippleAnimationRef lets a rapid second tap restart the wave from a clean surface.
  const rippleAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  // lastIndexRef distinguishes route changes from simple responsive remeasurement.
  const lastIndexRef = useRef<number>(activeIndex);
  // lastWidthRef distinguishes a device resize from an intentional tab transition.
  const lastWidthRef = useRef<number>(0);
  // hasPositionedIndicatorRef prevents an initial deep link from visibly travelling across the bar.
  const hasPositionedIndicatorRef = useRef<boolean>(false);

  // handleBarLayout stores only meaningful width changes to avoid restarting motion on every render.
  const handleBarLayout = useCallback((event: LayoutChangeEvent): void => {
    const nextWidth: number = event.nativeEvent.layout.width;
    setBarWidth((currentWidth: number): number =>
      Math.abs(currentWidth - nextWidth) > 0.5 ? nextWidth : currentWidth,
    );
  }, []);

  // triggerPressRipple originates the glass wave at touch-down instead of waiting for navigation.
  const triggerPressRipple = useCallback(
    (pressedIndex: number): void => {
      if (barWidth <= 0 || routeCount === 0 || reduceMotion) {
        return;
      }

      // targetOffset centers the ripple on the same fixed-size geometry as the moving bubble.
      const targetOffset: number = getActiveIndicatorOffset(
        barWidth,
        routeCount,
        pressedIndex,
      );

      rippleAnimationRef.current?.stop();
      rippleX.stopAnimation();
      rippleProgress.stopAnimation();
      rippleX.setValue(targetOffset);
      rippleProgress.setValue(0);

      // rippleAnimation stays readable without lingering over the selected destination.
      const rippleAnimation: Animated.CompositeAnimation = Animated.timing(
        rippleProgress,
        {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        },
      );
      rippleAnimationRef.current = rippleAnimation;
      rippleAnimation.start(
        ({ finished }: { finished: boolean }): void => {
          if (finished && rippleAnimationRef.current === rippleAnimation) {
            rippleAnimationRef.current = null;
          }
        },
      );
    },
    [barWidth, reduceMotion, rippleProgress, rippleX, routeCount],
  );

  useEffect((): (() => void) => {
    return (): void => {
      rippleAnimationRef.current?.stop();
    };
  }, []);

  useEffect((): (() => void) => {
    if (barWidth <= 0 || routeCount === 0) {
      return (): void => undefined;
    }

    // targetOffset centers the fixed-size selection bubble in the active equal-width tab.
    const targetOffset: number = getActiveIndicatorOffset(
      barWidth,
      routeCount,
      activeIndex,
    );
    const didResize: boolean = lastWidthRef.current !== barWidth;
    const didChangeRoute: boolean = lastIndexRef.current !== activeIndex;

    lastWidthRef.current = barWidth;
    lastIndexRef.current = activeIndex;

    if (
      !hasPositionedIndicatorRef.current ||
      reduceMotion ||
      (didResize && !didChangeRoute)
    ) {
      indicatorX.stopAnimation();
      indicatorPulse.stopAnimation();
      trailX.stopAnimation();
      trailProgress.stopAnimation();
      rippleAnimationRef.current?.stop();
      rippleProgress.stopAnimation();
      indicatorX.setValue(targetOffset);
      indicatorPulse.setValue(0);
      trailX.setValue(targetOffset);
      trailProgress.setValue(0);
      rippleX.setValue(targetOffset);
      rippleProgress.setValue(0);
      hasPositionedIndicatorRef.current = true;
      return (): void => undefined;
    }

    if (!didChangeRoute) {
      return (): void => undefined;
    }

    indicatorPulse.setValue(0);
    trailProgress.setValue(0);
    // transition combines lens travel and one delayed droplet after the immediate press ripple.
    const transition = Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: targetOffset,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
      Animated.sequence([
        Animated.timing(indicatorPulse, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(indicatorPulse, {
          toValue: 0,
          useNativeDriver: true,
          speed: 22,
          bounciness: 7,
        }),
      ]),
      Animated.spring(trailX, {
        toValue: targetOffset,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }),
      Animated.timing(trailProgress, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ]);
    transition.start();

    return (): void => {
      transition.stop();
    };
  }, [
    activeIndex,
    barWidth,
    indicatorPulse,
    indicatorX,
    reduceMotion,
    rippleProgress,
    rippleX,
    routeCount,
    trailProgress,
    trailX,
  ]);

  // indicatorScale creates a subtle uniform jelly pulse while guaranteeing a circle.
  const indicatorScale = indicatorPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  // trailOpacity makes the droplet visible only through the middle of its journey.
  const trailOpacity = trailProgress.interpolate({
    inputRange: [0, 0.18, 0.72, 1],
    outputRange: [0, 0.5, 0.34, 0],
  });
  // trailScale forms a small bead behind the lens and absorbs it on arrival.
  const trailScale = trailProgress.interpolate({
    inputRange: [0, 0.3, 0.72, 1],
    outputRange: [0.4, 0.9, 1, 0.24],
  });
  // rippleBloomOpacity exposes a broad translucent wash behind the brighter ring.
  const rippleBloomOpacity = rippleProgress.interpolate({
    inputRange: [0, 0.06, 0.48, 0.82, 1],
    outputRange: [0, 0.14, 0.07, 0.02, 0],
  });
  // rippleBloomScale lets the refracted wash reach neighboring destinations.
  const rippleBloomScale = rippleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.36, 4.6],
  });
  // rippleFrontOpacity makes the main ring appear immediately and remain readable mid-flight.
  const rippleFrontOpacity = rippleProgress.interpolate({
    inputRange: [0, 0.08, 0.36, 0.72, 1],
    outputRange: [0, 0.52, 0.38, 0.08, 0],
  });
  // rippleFrontScale expands the primary wave far beyond the former icon-sized halo.
  const rippleFrontScale = rippleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 4.25],
  });
  // rippleEchoOpacity introduces a delayed second ring without prolonging the whole transition.
  const rippleEchoOpacity = rippleProgress.interpolate({
    inputRange: [0, 0.2, 0.38, 0.72, 1],
    outputRange: [0, 0, 0.28, 0.06, 0],
  });
  // rippleEchoScale spreads the aftershock slightly farther than the primary ring.
  const rippleEchoScale = rippleProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.7, 0.7, 4.8],
  });

  return {
    barWidth,
    handleBarLayout,
    indicatorScale,
    indicatorX,
    rippleBloomOpacity,
    rippleBloomScale,
    rippleEchoOpacity,
    rippleEchoScale,
    rippleFrontOpacity,
    rippleFrontScale,
    rippleX,
    trailOpacity,
    trailScale,
    trailX,
    triggerPressRipple,
  };
}
