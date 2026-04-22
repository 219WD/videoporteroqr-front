import { Stack } from 'expo-router';

export default function CallsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
      }}
    >
      <Stack.Screen name="[callId]" />
    </Stack>
  );
}
