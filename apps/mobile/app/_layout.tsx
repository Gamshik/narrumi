import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AuthGate,
  AuthProvider,
  BootstrapProvider,
  EpisodeGenerationProvider,
  SorbetBackground,
  ThemeProvider,
  useAppTheme,
} from '@presentation/app';
import { sorbetFontAssets } from '@presentation/theme';
import { darkColors, lightColors, type AppColors } from '@presentation/theme/tokens';

// Keep the native splash visible until the Sorbet fonts finish loading so the
// first frame never renders text in the fallback system font.
void SplashScreen.preventAutoHideAsync();

// ThemedSafeAreaRootProps defines the app subtree rendered inside the colored safe-area provider.
type ThemedSafeAreaRootProps = {
  // children are the authenticated route tree and native stack navigator.
  readonly children: ReactNode;
};

// NavigationTheme is the React Navigation color contract consumed by Expo Router navigators.
type NavigationTheme = ReactNavigation.Theme;

// Root layout contract: provides app theme state and stack-level native presentations.
export default function Layout(): ReactElement {
  // fontsLoaded gates the first render until custom faces are ready to paint.
  const [fontsLoaded] = useFonts(sorbetFontAssets);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <></>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedSafeAreaRoot>
          <AuthProvider>
            <AuthGate>
              <BootstrapProvider>
                <EpisodeGenerationProvider>
                  <ThemedStack />
                </EpisodeGenerationProvider>
              </BootstrapProvider>
            </AuthGate>
          </AuthProvider>
        </ThemedSafeAreaRoot>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// ThemedSafeAreaRoot colors the stack parent that can be exposed by native swipe transitions.
function ThemedSafeAreaRoot({ children }: ThemedSafeAreaRootProps): ReactElement {
  const { isDark } = useAppTheme();
  // colors provides the background for the app-owned root native view.
  const colors: AppColors = isDark ? darkColors : lightColors;

  return (
    <SafeAreaProvider
      style={[styles.root, { backgroundColor: colors.backgroundPrimary }]}
    >
      <View style={styles.root}>
        <SorbetBackground colors={colors} />
        <NavigationThemeProvider
          value={isDark ? darkNavigationTheme : lightNavigationTheme}
        >
          {children}
        </NavigationThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

// createNavigationTheme maps app tokens to the native navigation surfaces visible during gestures.
function createNavigationTheme(colors: AppColors, isDark: boolean): NavigationTheme {
  return {
    dark: isDark,
    colors: {
      primary: colors.systemBlue,
      background: 'transparent',
      card: 'transparent',
      text: colors.labelPrimary,
      border: colors.separator,
      notification: colors.systemRed,
    },
    fonts: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '800',
      },
    },
  };
}

// lightNavigationTheme is built once so Router receives a stable light identity.
const lightNavigationTheme: NavigationTheme = createNavigationTheme(
  lightColors,
  false,
);
// darkNavigationTheme is built once so Router receives a stable dark identity.
const darkNavigationTheme: NavigationTheme = createNavigationTheme(
  darkColors,
  true,
);

// ThemedStack keeps the native navigation surfaces aligned with app appearance during route transitions.
function ThemedStack(): ReactElement {
  return (
    <View style={styles.stack}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="daily-session" options={{ headerShown: false }} />
        <Stack.Screen name="episode-reader" options={{ headerShown: false }} />
        <Stack.Screen name="series-details" options={{ headerShown: false }} />
        <Stack.Screen
          name="dictionary-word-details"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="delete-series-confirmation"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </View>
  );
}

// styles keep root layout objects stable during palette commits.
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stack: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
