// app/register-guest.tsx - VERSIÓN ACTUALIZADA
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../../utils/api";

interface HostInfo {
  name: string;
  email: string;
}

export default function RegisterGuest() {
  const params = useLocalSearchParams();
  const qrCode = params.code as string;
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [loadingHost, setLoadingHost] = useState(true);

  useEffect(() => {
    if (qrCode) {
      loadHostInfo();
    }
  }, [qrCode]);

  const loadHostInfo = async () => {
    try {
      setHostInfo({
        name: "Host (código: " + qrCode + ")",
        email: ""
      });
    } catch (error) {
      console.log("Error loading host info:", error);
    } finally {
      setLoadingHost(false);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.email) {
      Alert.alert("Error", "Nombre y email son obligatorios");
      return;
    }

    if (!qrCode) {
      Alert.alert("Error", "Código QR no válido");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/auth/register-guest?code=${qrCode}`, form);
      
      Alert.alert(
        "¡Registro exitoso!", 
        `Bienvenido ${response.data.guest.name}`,
        [
          { 
            text: "OK", 
            onPress: () => {
              if (form.password) {
                router.replace("/dashboard/guest");
              } else {
                router.replace("/(tabs)/auth/login");
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error("Register error:", error);
      Alert.alert("Error", error.response?.data?.error || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  if (loadingHost) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7D1522" />
        <Text style={styles.loadingText}>Cargando información del host...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Registro de Invitado</Text>
      
      {hostInfo && (
        <View style={styles.hostInfo}>
          <Text style={styles.hostInfoTitle}>🏠 Te estás uniendo a la sala de:</Text>
          <Text style={styles.hostInfoText}>Host: {hostInfo.name}</Text>
          {hostInfo.email && (
            <Text style={styles.hostInfoText}>Email: {hostInfo.email}</Text>
          )}
        </View>
      )}

      <Text style={styles.label}>Nombre completo</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(text) => setForm({ ...form, name: text })}
        placeholder="Tu nombre completo"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(text) => setForm({ ...form, email: text })}
        autoCapitalize="none"
        placeholder="tu@email.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Contraseña (opcional)</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
        placeholder="Opcional - puedes dejarlo en blanco"
        placeholderTextColor="#999"
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Registrando..." : "Registrarme como Invitado"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton}
        onPress={() => router.push("/qr/scan")}
      >
        <Text style={styles.secondaryButtonText}>Cancelar y volver al scanner</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFFFF",
  },
  loadingText: {
    marginTop: 10,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    marginBottom: 25,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  hostInfo: {
    backgroundColor: '#E8F5E8',
    padding: 18,
    borderRadius: 10,
    marginBottom: 25,
    borderColor: '#C8E6C9',
    borderWidth: 1,
  },
  hostInfoTitle: {
    color: '#2E7D32',
    marginBottom: 8,
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 16,
  },
  hostInfoText: {
    color: '#2E7D32',
    fontFamily: "BaiJamjuree",
    fontSize: 14,
    marginBottom: 4,
  },
  label: {
    color: "#3D3D3D",
    marginBottom: 10,
    fontFamily: "BaiJamjuree",
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3D3D3D",
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: "#FAFFFF",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
    minHeight: 50,
  },
  button: {
    backgroundColor: "#7D1522",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: "#B8B8B8",
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 18,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
};