import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  darkColors,
  floatingTabBarMetrics,
  lightColors,
  type AppColors,
} from '@presentation/theme';
import { useAppTheme } from '@presentation/app/theme';

import {
  createSorbetTabBarStyles,
  type SorbetTabBarStyles,
} from './SorbetTabBar.styles';
import { SorbetTabBubble } from './SorbetTabBubble';
import { SorbetTabItem } from './SorbetTabItem';
import type { SorbetTabIconName } from './SorbetTabIcon';
import { useActiveTabLensMotion } from './useActiveTabLensMotion';

// TAB_ICONS maps navigator route names to stable cross-platform vector symbols.
const TAB_ICONS: Readonly<Record<string, SorbetTabIconName>> = {
  index: 'home',
  dictionary: 'dictionary',
  settings: 'settings',
};

// SorbetTabBarProps extends the navigator contract with the shell-level motion preference.
type SorbetTabBarProps = BottomTabBarProps & {
  // reduceMotion keeps scene and dock animation decisions synchronized from one subscription.
  readonly reduceMotion: boolean;
};

// SorbetTabBar renders one toy-like Sorbet dock whose active bubble flows between destinations.
export function SorbetTabBar({
  state,
  descriptors,
  navigation,
  reduceMotion,
}: SorbetTabBarProps): ReactElement {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  // colors is the semantic palette used by every glass and selection layer.
  const colors: AppColors = isDark ? darkColors : lightColors;
  // styles stays stable until the user changes the active appearance.
  const styles: SorbetTabBarStyles = useMemo(
    (): SorbetTabBarStyles => createSorbetTabBarStyles(colors),
    [colors],
  );
  // tabMetrics keeps dock placement aligned with the shared scroll clearance contract.
  const tabMetrics = floatingTabBarMetrics(insets);
  // lensMotion owns the responsive position and reduced-motion-safe liquid transition.
  const lensMotion = useActiveTabLensMotion({
    activeIndex: state.index,
    reduceMotion,
    routeCount: state.routes.length,
  });

  return (
    <View
      onLayout={lensMotion.handleBarLayout}
      pointerEvents="box-none"
      style={[styles.root, { bottom: tabMetrics.bottomOffset }]}
    >
      <View pointerEvents="none" style={styles.toyShell}>
        <LinearGradient
          colors={colors.tabBarToyGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.toySurface}
        />
        <View style={styles.shellHighlight} />
        <View style={styles.shellShade} />
      </View>

      {lensMotion.barWidth > 0 ? (
        <>
          <View pointerEvents="none" style={styles.rippleClip}>
            <Animated.View
              style={[
                styles.pressRippleBloom,
                {
                  opacity: lensMotion.rippleBloomOpacity,
                  transform: [
                    { translateX: lensMotion.rippleX },
                    { scale: lensMotion.rippleBloomScale },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pressRippleFront,
                {
                  opacity: lensMotion.rippleFrontOpacity,
                  transform: [
                    { translateX: lensMotion.rippleX },
                    { scale: lensMotion.rippleFrontScale },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pressRippleEcho,
                {
                  opacity: lensMotion.rippleEchoOpacity,
                  transform: [
                    { translateX: lensMotion.rippleX },
                    { scale: lensMotion.rippleEchoScale },
                  ],
                },
              ]}
            />
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionTrail,
              {
                opacity: lensMotion.trailOpacity,
                transform: [
                  { translateX: lensMotion.trailX },
                  { scale: lensMotion.trailScale },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              {
                transform: [
                  { translateX: lensMotion.indicatorX },
                  { scale: lensMotion.indicatorScale },
                ],
              },
            ]}
          >
            <SorbetTabBubble colors={colors} />
          </Animated.View>
        </>
      ) : null}

      {state.routes.map((route, index): ReactElement => {
        const isFocused: boolean = state.index === index;
        const options = descriptors[route.key]?.options;
        // label respects native tab configuration before falling back to the route name.
        const label: string =
          typeof options?.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options?.title === 'string'
              ? options.title
              : route.name;
        const icon: SorbetTabIconName = TAB_ICONS[route.name] ?? 'home';

        // handlePressIn starts the ripple at touch-down, including repeat taps on the active route.
        const handlePressIn = (): void => {
          lensMotion.triggerPressRipple(index);
        };

        // handlePress mirrors the native tab press contract and respects preventDefault.
        const handlePress = (): void => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // handleLongPress preserves navigator integrations that listen for tab holds.
        const handleLongPress = (): void => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <SorbetTabItem
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
            colors={colors}
            icon={icon}
            isFocused={isFocused}
            key={route.key}
            label={label}
            onLongPress={handleLongPress}
            onPress={handlePress}
            onPressIn={handlePressIn}
            reduceMotion={reduceMotion}
            styles={styles}
            {...(options?.tabBarButtonTestID
              ? { testID: options.tabBarButtonTestID }
              : {})}
          />
        );
      })}
    </View>
  );
}
