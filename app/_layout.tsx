// app/_layout.tsx - VERSIÓN 100% FUNCIONAL con Legacy + SDK 54
// import 'react-native-reanimated';  ← BORRÁ ESTA LÍNEA

import { BaiJamjuree_400Regular, BaiJamjuree_700Bold } from '@expo-google-fonts/bai-jamjuree';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Stack } from "expo-router";
import { useContext } from 'react';
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "../context/AuthContext";
import { AuthContext } from "../context/AuthContext";
import CallSignalListener from "../components/CallSignalListener";
import PushNotificationBridge from "../components/PushNotificationBridge";

function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7D1522" />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      </Stack>
    );
  }

  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="calls" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BaiJamjuree': BaiJamjuree_400Regular,
    'BaiJamjuree-Bold': BaiJamjuree_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7D1522" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FAFFFF" translucent={false} />
      <AuthProvider>
        <PushNotificationBridge />
        <CallSignalListener />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
