import { Stack } from "expo-router";

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="admin" 
        options={{ title: "Panel de administración" }}
      />
      <Stack.Screen 
        name="host" 
        options={{ title: "Panel principal" }}
      />
    </Stack>
  );
}
