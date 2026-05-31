import { useMemo } from 'react';

import { darkColors, lightColors } from '@presentation/theme/tokens';

import { createStyles } from './MobileApp.styles';
import { useAppTheme } from './theme';

export function useAppStyles() {
  const { isDark } = useAppTheme();
  const colors = isDark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { isDark, styles };
}
