// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useUserRole } from "../../hooks/useUserRole";

export default function DashboardTabs() {
  const userRole = useUserRole();

  // Configuración con TODAS las pantallas creadas
  const getTabsConfig = () => {
    switch (userRole) {
      case 'admin':
        return [
          {
            name: "admin",
            title: "Dashboard",
            icon: "speedometer",
          },
          {
            name: "users",
            title: "Usuarios", 
            icon: "people",
          },
          {
            name: "settings",
            title: "Configuración",
            icon: "settings",
          }
        ];
      
      case 'host':
        return [
          {
            name: "host",
            title: "Mi Sala",
            icon: "home",
          },
          {
            name: "guests",
            title: "Invitados",
            icon: "people",
          },
          {
            name: "qr",
            title: "Mi QR",
            icon: "qr-code",
          },
          {
            name: "messages",
            title: "Mensajes",
            icon: "chatbubbles",
          }
        ];
      
      case 'guest':
      default:
        return [
          {
            name: "guest", 
            title: "Mi Sala",
            icon: "home",
          },
          {
            name: "messages",
            title: "Mensajes",
            icon: "chatbubbles",
          },
          {
            name: "scan",
            title: "Escanear",
            icon: "camera",
          },
          {
            name: "profile",
            title: "Perfil",
            icon: "person",
          }
        ];
    }
  };

  const tabsConfig = getTabsConfig();

  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8e8e93',
      }}
    >
      {tabsConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}