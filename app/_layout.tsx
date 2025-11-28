// app/_layout.tsx - VERSIÓN MEJORADA CON NOTIFICACIONES
import { BaiJamjuree_400Regular, BaiJamjuree_700Bold } from '@expo-google-fonts/bai-jamjuree';
import { Audio } from 'expo-av';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from "expo-router";
import { useEffect } from 'react';
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { VideoCallProvider } from "../context/VideoCallContext";

// ✅ CONFIGURAR NOTIFICACIONES GLOBALMENTE
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BaiJamjuree': BaiJamjuree_400Regular,
    'BaiJamjuree-Bold': BaiJamjuree_700Bold,
  });

  // ✅ CONFIGURAR NOTIFICACIONES Y AUDIO AL INICIAR
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Solicitar permisos de notificaciones
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('🔔 Permisos de notificación no concedidos');
          return;
        }

        // Configurar canal de notificaciones (Android)
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#7D1522',
        });

        console.log('🔔 Notificaciones configuradas correctamente');
      } catch (error) {
        console.error('🔔 Error configurando notificaciones:', error);
      }
    };

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log("🎧 Audio configurado globalmente correctamente");
      } catch (error) {
        console.error("🎧 Error configurando audio global:", error);
      }
    };

    setupNotifications();
    setupAudio();
  }, []);

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
          <Stack.Screen name="register-host" options={{ title: "Registrar Host" }} />
          <Stack.Screen name="register-guest" options={{ title: "Registro Invitado" }} />
          <Stack.Screen name="video-call" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </VideoCallProvider>
    </AuthProvider>
  );
}