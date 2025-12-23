import { Stack } from "expo-router";
import { useUserRole } from "../../hooks/useUserRole";

export default function DashboardLayout() {
  const userRole = useUserRole();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="admin" 
        options={{ title: "Admin Dashboard" }}
      />
      <Stack.Screen 
        name="host" 
        options={{ title: "Host Dashboard" }}
      />
      <Stack.Screen 
        name="guest" 
        options={{ title: "Guest Dashboard" }}
      />
    </Stack>
  );
}