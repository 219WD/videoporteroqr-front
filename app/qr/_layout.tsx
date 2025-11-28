// app/qr/_layout.tsx
import { Stack } from "expo-router";

export default function QRLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="scan" 
        options={{ 
          title: "Escanear QR",
          headerShown: true 
        }} 
      />
    </Stack>
  );
}