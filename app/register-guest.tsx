// app/register-guest.tsx - VERSIÓN CON SCROLL
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../utils/api";

export default function RegisterGuest() {
  const params = useLocalSearchParams();
  const qrCode = params.code as string;
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [hostInfo, setHostInfo] = useState("");

  useEffect(() => {
    if (qrCode) {
      setHostInfo(`Te registrarás como invitado del host con código: ${qrCode}`);
    }
  }, [qrCode]);

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
            onPress: () => router.replace("/(tabs)/auth/login") 
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

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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
            <Text style={styles.hostInfoText}>{hostInfo}</Text>
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
          onPress={() => router.push("/(tabs)/auth/login")}
        >
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta - Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = {
  scrollContainer: {
    flex: 1,
    backgroundColor: "#FAFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
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
    padding: 16,
    borderRadius: 10,
    marginBottom: 25,
    borderColor: '#C8E6C9',
    borderWidth: 1,
  },
  hostInfoText: {
    color: '#2E7D32',
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 16,
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
    marginBottom: 30, // Espacio extra al final para mejor scroll
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
};