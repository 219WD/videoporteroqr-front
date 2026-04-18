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
        options={{ title: "Admin Dashboard" }}
      />
      <Stack.Screen 
        name="host" 
        options={{ title: "Host Dashboard" }}
      />
    </Stack>
  );
}
