import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

// ThemeContextValue is the presentation contract for app appearance state.
type ThemeContextValue = {
  // isDark is the resolved theme after applying the user override.
  readonly isDark: boolean;
  // setDarkMode immediately stores a runtime override for the app theme.
  readonly setDarkMode: (isDark: boolean) => void;
};

// ThemeContext is undefined outside ThemeProvider to catch invalid hook usage.
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// THEME_OVERRIDE_KEY stores the user's explicit dark-mode choice across launches.
const THEME_OVERRIDE_KEY = '@context-english/theme-override';

// ThemeProviderProps defines the subtree that receives app theme state.
type ThemeProviderProps = {
  // children are all routes that need themed styles and settings access.
  readonly children: ReactNode;
};

// ThemeProvider resolves system appearance with an immediate in-app override.
export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const systemScheme = useColorScheme();
  const [darkModeOverride, setDarkModeOverride] = useState<boolean>();
  // hasUserSelectedThemeRef prevents late startup hydration from undoing direct input.
  const hasUserSelectedThemeRef = useRef<boolean>(false);

  useEffect((): (() => void) => {
    // isActive prevents storage hydration from updating an unmounted provider.
    let isActive: boolean = true;

    void AsyncStorage.getItem(THEME_OVERRIDE_KEY).then((
      value: string | null,
    ): void => {
      if (
        isActive &&
        !hasUserSelectedThemeRef.current &&
        value !== null
      ) {
        setDarkModeOverride(value === 'dark');
      }
    });

    return (): void => {
      isActive = false;
    };
  }, []);

  // isDark is the live committed theme updated in the interaction frame.
  const isDark: boolean = darkModeOverride ?? systemScheme === 'dark';
  // setDarkMode updates the palette before persistence can perform asynchronous work.
  const setDarkMode = useCallback((nextIsDark: boolean): void => {
    hasUserSelectedThemeRef.current = true;
    setDarkModeOverride(nextIsDark);
    void AsyncStorage.setItem(
      THEME_OVERRIDE_KEY,
      nextIsDark ? 'dark' : 'light',
    );
  }, []);
  // value changes only when the resolved palette changes.
  const value = useMemo<ThemeContextValue>(
    (): ThemeContextValue => ({
      isDark,
      setDarkMode,
    }),
    [isDark, setDarkMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// useAppTheme exposes the required theme context to presentation components.
export function useAppTheme(): ThemeContextValue {
  // value is the committed palette contract supplied by ThemeProvider.
  const value: ThemeContextValue | undefined = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }

  return value;
}
