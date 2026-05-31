import { Stack } from 'expo-router';
import { DynamicColorIOS } from 'react-native';

import { ThemeProvider } from '@presentation/app';

const sheetBackgroundColor = DynamicColorIOS({
  dark: '#1c1c1e',
  light: '#ffffff',
});

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="dictionary-word-details"
          options={{
            contentStyle: { backgroundColor: sheetBackgroundColor },
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetCornerRadius: 28,
            sheetGrabberVisible: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
