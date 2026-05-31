import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

// ThemeContextValue is the presentation contract for app appearance state.
type ThemeContextValue = {
  // isDark is the resolved theme after applying the user override.
  readonly isDark: boolean;
  // setDarkMode stores a runtime override for the app theme.
  readonly setDarkMode: (isDark: boolean) => void;
};

// ThemeContext is undefined outside ThemeProvider to catch invalid hook usage.
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ThemeProviderProps defines the subtree that receives app theme state.
type ThemeProviderProps = {
  // children are all routes that need themed styles and settings access.
  readonly children: ReactNode;
};

// ThemeProvider resolves system appearance with an in-app dark-mode override.
export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const systemScheme = useColorScheme();
  const [darkModeOverride, setDarkModeOverride] = useState<boolean>();
  // value is memoized so themed screens only update when appearance state changes.
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

// useAppTheme exposes the required theme context to presentation components.
export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return value;
}
