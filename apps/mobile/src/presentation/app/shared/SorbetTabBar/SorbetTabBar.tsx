import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkColors, lightColors } from '@presentation/theme/tokens';

import { useAppStyles } from '../../useAppStyles';
import { JellyPressable } from '../JellyPressable';

// TAB_GLYPHS maps each tab route name to its Sorbet emoji icon from the mockups.
const TAB_GLYPHS: Record<string, string> = {
  index: '🏠',
  dictionary: '📖',
  settings: '⚙️',
};

// SorbetTabBar renders the floating claymorphic pill navigation from the mockups:
// a blurred translucent capsule that hovers above the safe area, with the active
// tab lifted into a grape gradient icon puck. It replaces the native tab shell so
// the whole app matches the Sorbet design language on both platforms.
export function SorbetTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): ReactElement {
  const { isDark, styles } = useAppStyles();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  // bottom lifts the pill clear of the home indicator while keeping it floating.
  const bottom = Math.max(insets.bottom, 12) + 6;

  return (
    <View pointerEvents="box-none" style={[styles.tabBar, { bottom }]}>
      <BlurView
        intensity={28}
        pointerEvents="none"
        style={styles.tabBarBlur}
        tint={isDark ? 'dark' : 'light'}
      />
      <View pointerEvents="none" style={styles.tabBarFill} />
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const options = descriptors[route.key]?.options;
        const label =
          typeof options?.title === 'string' ? options.title : route.name;
        const glyph = TAB_GLYPHS[route.name] ?? '•';

        // handlePress mirrors the native tab press contract (respects preventDefault).
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

        return (
          <JellyPressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            containerStyle={styles.tabItemContainer}
            key={route.key}
            onPress={handlePress}
            scaleTo={0.88}
            style={styles.tabItem}
          >
            {isFocused ? (
              <LinearGradient
                colors={[colors.systemPurple, colors.systemBlue]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={[
                  styles.tabIcon,
                  styles.tabIconActive,
                  styles.tabIconLift,
                ]}
              >
                <Text style={[styles.tabGlyph, styles.tabGlyphActive]}>
                  {glyph}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabIcon}>
                <Text style={styles.tabGlyph}>{glyph}</Text>
              </View>
            )}
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </JellyPressable>
        );
      })}
    </View>
  );
}
