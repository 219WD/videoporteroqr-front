// app/index.tsx - VERSIÓN CORREGIDA
import { Redirect } from "expo-router";
import { useContext } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthContext } from "../../context/AuthContext";

export default function IndexPage() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7D1522" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(tabs)/auth" />;
  }

  // Redirigir según el rol
  if (user.role === "admin") return <Redirect href="/dashboard/admin" />;
  if (user.role === "host") return <Redirect href="/dashboard/host" />;
  return <Redirect href="/dashboard/guest" />;
}