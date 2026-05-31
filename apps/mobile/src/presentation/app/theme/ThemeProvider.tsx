import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

type ThemeContextValue = {
  readonly isDark: boolean;
  readonly setDarkMode: (isDark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [darkModeOverride, setDarkModeOverride] = useState<boolean>();
  const value = useMemo(
    () => ({
      isDark: darkModeOverride ?? systemScheme === 'dark',
      setDarkMode: setDarkModeOverride,
    }),
    [darkModeOverride, systemScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return value;
}
