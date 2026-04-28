import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 83 + bottomInset,
          paddingBottom: 20 + bottomInset,
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
