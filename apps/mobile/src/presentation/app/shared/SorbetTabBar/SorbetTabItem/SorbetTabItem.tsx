import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Animated } from 'react-native';

import { motion, type AppColors } from '@presentation/theme';

import { JellyPressable } from '../../JellyPressable';
import type { SorbetTabBarStyles } from '../SorbetTabBar.styles';
import { SorbetTabIcon, type SorbetTabIconName } from '../SorbetTabIcon';

// SorbetTabItemProps defines one accessible destination layered above the moving lens.
type SorbetTabItemProps = {
  // accessibilityLabel provides caller-customized assistive text when configured.
  readonly accessibilityLabel: string;
  // colors supplies semantic active and inactive icon colors.
  readonly colors: AppColors;
  // icon identifies the vector symbol for this destination.
  readonly icon: SorbetTabIconName;
  // isFocused drives icon and caption cross-fades without changing layout.
  readonly isFocused: boolean;
  // label is the concise visible destination name.
  readonly label: string;
  // onLongPress preserves the native tab navigator event contract.
  readonly onLongPress: () => void;
  // onPress performs the guarded route change owned by the navigator.
  readonly onPress: () => void;
  // onPressIn starts immediate material feedback before navigation settles.
  readonly onPressIn: () => void;
  // reduceMotion replaces decorative interpolation with an immediate state update.
  readonly reduceMotion: boolean;
  // styles is the theme-bound geometry shared by every destination.
  readonly styles: SorbetTabBarStyles;
  // testID exposes the configured route target to automated UI tests.
  readonly testID?: string;
};

// SorbetTabItem cross-fades vector strokes and lifts the active caption over the shared lens.
export function SorbetTabItem({
  accessibilityLabel,
  colors,
  icon,
  isFocused,
  label,
  onLongPress,
  onPress,
  onPressIn,
  reduceMotion,
  styles,
  testID,
}: SorbetTabItemProps): ReactElement {
  // focusProgress keeps visual state transitions independent from navigation layout.
  const [focusProgress] = useState(
    (): Animated.Value => new Animated.Value(isFocused ? 1 : 0),
  );

  useEffect((): (() => void) => {
    focusProgress.stopAnimation();

    if (reduceMotion) {
      focusProgress.setValue(isFocused ? 1 : 0);
      return (): void => undefined;
    }

    // animation gives the selected symbol a short Sorbet lift without delaying navigation.
    const animation = Animated.spring(focusProgress, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 5,
    });
    animation.start();

    return (): void => {
      animation.stop();
    };
  }, [focusProgress, isFocused, reduceMotion]);

  // inactiveOpacity recedes the neutral stroke as the active stroke settles into place.
  const inactiveOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  // inactiveScale compresses the neutral symbol into the moving lens during selection.
  const inactiveScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.82],
  });
  // activeScale gives the selected vector a restrained physical lift.
  const activeScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, motion.selectedScale],
  });
  // activeTranslateY lets the selected vector rise as the liquid lens arrives.
  const activeTranslateY = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -1],
  });
  // activeLabelTranslateY reveals the focused label from below without reflow.
  const activeLabelTranslateY = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 0],
  });
  // focusDotScale grows the small meniscus only after this destination becomes active.
  const focusDotScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });

  return (
    <JellyPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      containerStyle={styles.itemContainer}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      scaleTo={motion.tabPressScale}
      style={styles.itemPressable}
      {...(testID ? { testID } : {})}
    >
      <Animated.View style={styles.iconSlot}>
        <Animated.View
          style={[
            styles.iconLayer,
            {
              opacity: inactiveOpacity,
              transform: [{ scale: inactiveScale }],
            },
          ]}
        >
          <SorbetTabIcon color={colors.labelSecondary} name={icon} />
        </Animated.View>
        <Animated.View
          style={[
            styles.iconLayer,
            {
              opacity: focusProgress,
              transform: [
                { translateY: activeTranslateY },
                { scale: activeScale },
              ],
            },
          ]}
        >
          <SorbetTabIcon color={colors.tabBarActiveContent} name={icon} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={styles.labelSlot}>
        <Animated.Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={[
            styles.label,
            styles.labelLayer,
            { opacity: inactiveOpacity },
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={[
            styles.label,
            styles.labelActive,
            styles.labelLayer,
            {
              opacity: focusProgress,
              transform: [{ translateY: activeLabelTranslateY }],
            },
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.View
          style={[
            styles.focusDot,
            {
              opacity: focusProgress,
              transform: [{ scale: focusDotScale }],
            },
          ]}
        />
      </Animated.View>
    </JellyPressable>
  );
}
