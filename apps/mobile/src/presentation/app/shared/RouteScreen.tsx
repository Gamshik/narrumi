import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppStyles } from '../types';

// RouteScreenProps defines the shared route shell inputs.
type RouteScreenProps = {
  // children is the route content rendered inside the safe area.
  readonly children: ReactNode;
  // isDark selects the native status-bar foreground style.
  readonly isDark: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// RouteScreen centralizes safe-area and status-bar behavior for tab routes.
export function RouteScreen({
  children,
  isDark,
  styles,
}: RouteScreenProps): ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
