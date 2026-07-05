import { useMemo } from 'react';

import { darkColors, lightColors } from '@presentation/theme/tokens';

import { createStyles } from './MobileApp.styles';
import { useAppTheme } from './theme';
import type { AppStyles } from './types';

// AppStylesState is the hook result consumed by Expo route components.
type AppStylesState = {
  // isDark is the resolved app appearance used by native chrome.
  readonly isDark: boolean;
  // colors is the active theme token set.
  readonly colors: typeof lightColors | typeof darkColors;
  // styles is the generated React Native StyleSheet for the active theme.
  readonly styles: AppStyles;
};

// useAppStyles binds the active theme tokens to the app StyleSheet contract.
export function useAppStyles(): AppStylesState {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  // styles is memoized so render paths do not recreate StyleSheet objects.
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { isDark, colors, styles };
}
