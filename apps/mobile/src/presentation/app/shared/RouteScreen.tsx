import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native';

import type { AppStyles } from '../types';

export function RouteScreen({
  children,
  isDark,
  styles,
}: {
  readonly children: ReactNode;
  readonly isDark: boolean;
  readonly styles: AppStyles;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
