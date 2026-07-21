import { Animated, type ViewStyle } from 'react-native';

// TabSceneInterpolationProps is the progress contract supplied by the bottom-tab navigator.
type TabSceneInterpolationProps = {
  // current contains the route-local progress from an inactive edge to the focused center.
  readonly current: {
    // progress is -1 or 1 while inactive and 0 while focused.
    readonly progress: Animated.Value;
  };
};

// TabSceneInterpolationResult is the animated scene style consumed by Expo Router tabs.
type TabSceneInterpolationResult = {
  // sceneStyle fades content in sequence and adds a restrained directional offset.
  readonly sceneStyle: Animated.WithAnimatedObject<ViewStyle>;
};

// interpolateAndroidTabScene prevents two transparent route contents from staying legible at once.
export function interpolateAndroidTabScene({
  current,
}: TabSceneInterpolationProps): TabSceneInterpolationResult {
  // opacity drops the outgoing content before the incoming content becomes readable.
  const opacity: Animated.AnimatedInterpolation<number> =
    current.progress.interpolate({
      inputRange: [-1, -0.52, 0, 0.52, 1],
      outputRange: [0, 0, 1, 0, 0],
      extrapolate: 'clamp',
    });
  // translateX retains the Sorbet directional cue without sliding complete screens over each other.
  const translateX: Animated.AnimatedInterpolation<number> =
    current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-18, 0, 18],
      extrapolate: 'clamp',
    });

  return {
    sceneStyle: {
      opacity,
      transform: [{ translateX }],
    },
  };
}
