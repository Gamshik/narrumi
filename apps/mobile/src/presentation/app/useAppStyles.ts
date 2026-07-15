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

// lightAppStyles is built once so light-theme commits only select a stable contract.
const lightAppStyles: AppStyles = createStyles(lightColors);
// darkAppStyles is built once so dark-theme commits avoid repeated 264-key allocation.
const darkAppStyles: AppStyles = createStyles(darkColors);

// useAppStyles binds the active theme tokens to the app StyleSheet contract.
export function useAppStyles(): AppStylesState {
  const { isDark } = useAppTheme();
  // colors selects one module-stable semantic palette object.
  const colors: typeof lightColors | typeof darkColors = isDark
    ? darkColors
    : lightColors;
  // styles selects a prebuilt StyleSheet instead of rebuilding it per consumer.
  const styles: AppStyles = isDark ? darkAppStyles : lightAppStyles;

  return { isDark, colors, styles };
}
