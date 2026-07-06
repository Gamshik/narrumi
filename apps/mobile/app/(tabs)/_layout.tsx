import { Tabs } from 'expo-router/js-tabs';
import { useSegments } from 'expo-router';
import type { ReactElement } from 'react';

import { SorbetTabBar, canRenderGuardedSurfaces, useAppTheme, useBootstrapSession } from '@presentation/app';
import { darkColors, lightColors, type AppColors } from '@presentation/theme/tokens';

// Route layout contract: renders the main screens inside the custom Sorbet
// floating tab bar instead of the native bottom tab shell, so navigation matches
// the claymorphic mockups on every platform.
export default function TabsLayout(): ReactElement {
  const { isDark } = useAppTheme();
  // colors provides the scene background shown while tab routes animate or mount.
  const colors: AppColors = isDark ? darkColors : lightColors;
  
  const { state } = useBootstrapSession();
  const segments = useSegments();

  // D-15: Hide the tab shell when a guarded surface is resolving its bootstrap state.
  const isSettingsActive = segments[segments.length - 1] === 'settings';
  const isGuardingSettings = isSettingsActive && !canRenderGuardedSurfaces(state);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.backgroundPrimary },
      }}
      tabBar={(props) => (isGuardingSettings ? null : <SorbetTabBar {...props} />)}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="dictionary" options={{ title: 'Dictionary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
