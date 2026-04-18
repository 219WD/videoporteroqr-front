// app/_layout.tsx - VERSIÓN 100% FUNCIONAL con Legacy + SDK 54
// import 'react-native-reanimated';  ← BORRÁ ESTA LÍNEA

import { BaiJamjuree_400Regular, BaiJamjuree_700Bold } from '@expo-google-fonts/bai-jamjuree';
import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { useEffect } from 'react';
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { VideoCallProvider } from "../context/VideoCallContext";

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
    <AuthProvider>
      <VideoCallProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="qr" options={{ headerShown: false }} />
          <Stack.Screen name="video-call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </VideoCallProvider>
    </AuthProvider>
  );
}
