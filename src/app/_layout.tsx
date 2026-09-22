import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { StoreProvider, useStore } from '@/lib/store';
import { navDark, navLight, paperDark, paperLight } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready } = useStore();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alerta/[id]" />
      <Stack.Screen name="sitio-nuevo" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  return (
    <PaperProvider theme={dark ? paperDark : paperLight}>
      <ThemeProvider value={dark ? navDark : navLight}>
        <StoreProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <RootStack />
        </StoreProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}
