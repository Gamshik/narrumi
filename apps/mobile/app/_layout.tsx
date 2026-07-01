import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { DynamicColorIOS, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate, AuthProvider, ThemeProvider } from '@presentation/app';
import { sorbetFontAssets } from '@presentation/theme';

// Native sheet background must match the app appearance outside React-managed views.
const sheetBackgroundColor =
  Platform.OS === 'ios'
    ? DynamicColorIOS({
        dark: '#241c2e',
        light: '#ffffff',
      })
    : '#ffffff';

// Keep the native splash visible until the Sorbet fonts finish loading so the
// first frame never renders text in the fallback system font.
void SplashScreen.preventAutoHideAsync();

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
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="daily-session"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="episode-reader"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="series-details"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="dictionary-word-details"
                options={{
                  contentStyle: { backgroundColor: sheetBackgroundColor },
                  headerShown: false,
                  presentation: 'formSheet',
                  // The sheet height must follow dictionary content; fixed detents
                  // either leave empty space or clip words with longer examples.
                  sheetAllowedDetents: 'fitToContents',
                  sheetCornerRadius: 28,
                  sheetGrabberVisible: true,
                }}
              />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
