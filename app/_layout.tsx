// app/_layout.tsx - VERSIÓN 100% FUNCIONAL con Legacy + SDK 54
// import 'react-native-reanimated';  ← BORRÁ ESTA LÍNEA

import { BaiJamjuree_400Regular, BaiJamjuree_700Bold } from '@expo-google-fonts/bai-jamjuree';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Stack } from "expo-router";
import { useContext, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "../context/AuthContext";
import { AuthContext } from "../context/AuthContext";
import PushNotificationBridge from "../components/PushNotificationBridge";
import WebSocketBridge from "../components/WebSocketBridge";
import { setupConsoleLogging } from '../utils/logger';

setupConsoleLogging();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore repeated calls during fast refresh.
});

function AppNavigator({ appReady }: { appReady: boolean }) {
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (appReady && !loading) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore splash hide races on startup.
      });
    }
  }, [appReady, loading]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[callId]" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[callId]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BaiJamjuree': BaiJamjuree_400Regular,
    'BaiJamjuree-Bold': BaiJamjuree_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FAFFFF" translucent={false} />
      <AuthProvider>
        <PushNotificationBridge />
        <WebSocketBridge />
        <AppNavigator appReady={fontsLoaded} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
