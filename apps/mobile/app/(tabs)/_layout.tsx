import { Tabs } from 'expo-router/js-tabs';
import { useSegments } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';

import {
  SorbetTabBar,
  canRenderGuardedSurfaces,
  interpolateAndroidTabScene,
  useBootstrapSession,
  useReducedMotionPreference,
} from '@presentation/app';

// Route layout contract: renders the main screens inside the custom Sorbet
// floating tab bar instead of the native bottom tab shell, so navigation matches
// the claymorphic mockups on every platform.
export default function TabsLayout(): ReactElement {
  const { state } = useBootstrapSession();
  const segments = useSegments();
  const reduceMotion = useReducedMotionPreference();

  // D-15: Hide the tab shell when a guarded surface is resolving its bootstrap state.
  const isSettingsActive = segments[segments.length - 1] === 'settings';
  const isGuardingSettings = isSettingsActive && !canRenderGuardedSurfaces(state);

  return (
    <Tabs
      screenOptions={{
        // Android fade avoids transparent scenes sliding over one another while iOS keeps directional motion.
        animation: reduceMotion
          ? 'none'
          : Platform.OS === 'android'
            ? 'fade'
            : 'shift',
        ...(Platform.OS === 'android' && !reduceMotion
          ? { sceneStyleInterpolator: interpolateAndroidTabScene }
          : {}),
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
      tabBar={(props) =>
        isGuardingSettings ? null : (
          <SorbetTabBar {...props} reduceMotion={reduceMotion} />
        )
      }
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="dictionary" options={{ title: 'Dictionary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
