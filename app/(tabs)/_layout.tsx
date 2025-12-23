// app/(tabs)/_layout.tsx - CON LOGO PERSONALIZADO
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Image } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 83,
          paddingBottom: 20,
          paddingTop: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },
        tabBarActiveTintColor: '#7D1522',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarLabelStyle: {
          fontFamily: 'BaiJamjuree',
          fontSize: 11,
          marginBottom: 0,
          paddingBottom: 0,
          marginTop: 4,
          includeFontPadding: false,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: 0,
          marginTop: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Inicio",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name={focused ? "home" : "home-outline"} 
            size={26}
            color={color} 
          />
        ),
      }} />
      
      <Tabs.Screen name="explore" options={{
        title: "Explorar",
        tabBarIcon: ({ color, focused }) => (
          focused ? (
            // Logo cuando está activo (focused)
            <Image
              source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
              style={{
                width: 28,
                height: 28,
                tintColor: color, // Opcional: aplicar color si quieres
              }}
              resizeMode="contain"
            />
          ) : (
            // Logo cuando está inactivo (outline o versión alternativa)
            <Image
              source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
              style={{
                width: 26,
                height: 26,
                opacity: 0.7, // Un poco más tenue cuando no está activo
              }}
              resizeMode="contain"
            />
          )
        ),
      }} />
      
      <Tabs.Screen name="auth" options={{
        title: "Cuenta",
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name={focused ? "person" : "person-outline"} 
            size={26}
            color={color} 
          />
        ),
      }} />
      
      {/* Ocultar otras pantallas */}
      {['qr', 'messages', 'guest-messages', 'dashboard', 'video-call', 'register-host'].map((screen) => (
        <Tabs.Screen
          key={screen}
          name={screen}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}