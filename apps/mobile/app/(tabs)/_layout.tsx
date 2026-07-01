import { Tabs } from 'expo-router/js-tabs';
import type { ReactElement } from 'react';

import { SorbetTabBar } from '@presentation/app';

// Route layout contract: renders the main screens inside the custom Sorbet
// floating tab bar instead of the native bottom tab shell, so navigation matches
// the claymorphic mockups on every platform.
export default function TabsLayout(): ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <SorbetTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="dictionary" options={{ title: 'Dictionary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
