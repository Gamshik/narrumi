import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { darkColors, lightColors } from '@presentation/theme/tokens';

import type { AppStyles } from '../types';
import { SorbetBackground } from './SorbetBackground';

// RouteScreenProps defines the shared route shell inputs.
type RouteScreenProps = {
  // children is the route content rendered inside the safe area.
  readonly children: ReactNode;
  // isDark selects the native status-bar foreground style and gradient palette.
  readonly isDark: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// RouteScreen centralizes safe-area, Sorbet backdrop, and status-bar behavior for tab routes.
export function RouteScreen({
  children,
  isDark,
  styles,
}: RouteScreenProps): ReactElement {
  // colors selects the Sorbet gradient and blob tints for the resolved appearance.
  const colors = isDark ? darkColors : lightColors;

  return (
    <SafeAreaView style={styles.safeArea}>
      <SorbetBackground colors={colors} />
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
