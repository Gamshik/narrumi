import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppStyles } from '@presentation/app/types';

// RouteScreenProps defines the shared route shell inputs.
type RouteScreenProps = {
  // children is the route content rendered inside the safe area.
  readonly children: ReactNode;
  // isDark selects the native status-bar foreground style and gradient palette.
  readonly isDark: boolean;
  // isEdgeToEdge lets a route render below system areas while retaining horizontal safe-area protection.
  readonly isEdgeToEdge?: boolean;
  // styles is the current theme StyleSheet contract.
  readonly styles: AppStyles;
};

// RouteScreen centralizes safe-area, Sorbet backdrop, and status-bar behavior for tab routes.
export function RouteScreen({
  children,
  isDark,
  isEdgeToEdge = false,
  styles,
}: RouteScreenProps): ReactElement {
  return (
    <SafeAreaView
      edges={
        isEdgeToEdge
          ? ['left', 'right']
          : ['top', 'right', 'bottom', 'left']
      }
      style={styles.routeSafeArea}
    >
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
