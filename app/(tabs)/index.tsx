// app/index.tsx
import { useContext } from "react";
import { View, Text } from "react-native";
import { Redirect } from "expo-router";
import { AuthContext } from "../../context/AuthContext";

export default function IndexPage() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(tabs)/auth/login" />;
  }

  // Redirigir según el rol
  if (user.role === "admin") return <Redirect href="/dashboard/admin" />;
  if (user.role === "host") return <Redirect href="/dashboard/host" />;
  return <Redirect href="/dashboard/guest" />;
}