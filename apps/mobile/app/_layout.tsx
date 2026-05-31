import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { DynamicColorIOS } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@presentation/app';

// Native sheet background must match the app appearance outside React-managed views.
const sheetBackgroundColor = DynamicColorIOS({
  dark: '#1c1c1e',
  light: '#ffffff',
});

// Root layout contract: provides app theme state and stack-level native presentations.
export default function Layout(): ReactElement {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="daily-session" options={{ headerShown: false }} />
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
