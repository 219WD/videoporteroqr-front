// app/(tabs)/auth/login.tsx - VERSIÓN CON BOTONES MÁS GRANDES
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../../context/AuthContext";
import { api } from "../../../utils/api";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const params = useLocalSearchParams();
  const qrCode = params.qrCode as string;

  useEffect(() => {
    if (qrCode) {
      console.log("📱 Login con código QR detectado:", qrCode);
    }
  }, [qrCode]);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);

      if (qrCode) {
        console.log("📱 Login exitoso, uniéndose al host con código:", qrCode);
        
        try {
          const response = await api.post(`/auth/join-host?code=${qrCode}`);
          
          Alert.alert(
            "✅ ¡Bienvenido!",
            `Te has unido a la sala\n${response.data.message}`,
            [
              { 
                text: "OK", 
                onPress: () => router.replace("/dashboard/guest")
              }
            ]
          );
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || "Error al unirse a la sala";
          
          if (errorMessage.includes("Ya estás en esta sala")) {
            Alert.alert(
              "✅ ¡Bienvenido!",
              "Ya estás en esta sala",
              [
                { 
                  text: "OK", 
                  onPress: () => router.replace("/dashboard/guest")
                }
              ]
            );
          } else {
            Alert.alert(
              "✅ Login exitoso",
              `Pero no se pudo unir a la sala: ${errorMessage}`,
              [
                { 
                  text: "OK", 
                  onPress: () => {
                    if (user.role === "admin") router.replace("/dashboard/admin");
                    else if (user.role === "host") router.replace("/dashboard/host");
                    else router.replace("/dashboard/guest");
                  }
                }
              ]
            );
          }
        }
      } else {
        if (user.role === "admin") router.replace("/dashboard/admin");
        else if (user.role === "host") router.replace("/dashboard/host");
        else router.replace("/dashboard/guest");
      }
    } catch (error) {
      console.log("Login error:", error);
      Alert.alert("Error", "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo - VERSIÓN CON URL */}
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Iniciar Sesión</Text>

      {qrCode && (
        <View style={styles.qrBanner}>
          <Text style={styles.qrBannerTitle}>📱 Te estás uniendo a una sala</Text>
          <Text style={styles.qrBannerText}>Inicia sesión para unirte automáticamente</Text>
        </View>
      )}
      
      <Text style={styles.label}>Email</Text>
      <TextInput 
        style={styles.input} 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
        placeholder="tu@email.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput 
        style={styles.input} 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
        placeholder="Tu contraseña"
        placeholderTextColor="#999"
      />

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin} 
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Text>
      </TouchableOpacity>

      <View style={styles.secondaryButtons}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => {
            if (qrCode) {
              router.push(`/register-guest?code=${qrCode}`);
            } else {
              router.push("/(tabs)/auth/register");
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>

        {!qrCode && (
          <TouchableOpacity 
            style={styles.qrButton}
            onPress={() => router.push("/qr/scan")}
          >
            <Text style={styles.qrButtonText}>Escanear QR de invitado</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#FAFFFF",
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 140, // Aumentado
    height: 140, // Aumentado
  },
  title: {
    fontSize: 32, // Aumentado
    marginBottom: 20, // Aumentado
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  label: {
    color: "#3D3D3D",
    marginBottom: 10, // Aumentado
    fontFamily: "BaiJamjuree",
    fontSize: 16, // Aumentado
  },
  input: {
    borderWidth: 1,
    borderColor: "#3D3D3D",
    padding: 16, // Aumentado
    marginBottom: 20, // Aumentado
    borderRadius: 10, // Aumentado
    backgroundColor: "#FAFFFF",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16, // Aumentado
    minHeight: 50, // Añadido para inputs más altos
  },
  button: {
    backgroundColor: "#7D1522",
    padding: 18, // Aumentado
    borderRadius: 10, // Aumentado
    alignItems: "center",
    marginBottom: 15, // Aumentado
    minHeight: 60, // Añadido para botón más alto
    justifyContent: 'center', // Añadido para centrar texto verticalmente
  },
  buttonDisabled: {
    backgroundColor: "#B8B8B8",
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 18, // Aumentado
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButtons: {
    marginTop: 25, // Aumentado
  },
  secondaryButton: {
    padding: 16, // Aumentado
    borderRadius: 10, // Aumentado
    alignItems: "center",
    marginBottom: 12, // Aumentado
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 50, // Añadido para botón más alto
    justifyContent: 'center', // Añadido para centrar texto verticalmente
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 16, // Aumentado
    fontFamily: "BaiJamjuree",
  },
  qrButton: {
    padding: 16, // Aumentado
    borderRadius: 10, // Aumentado
    alignItems: "center",
    backgroundColor: "#3D3D3D",
    minHeight: 50, // Añadido para botón más alto
    justifyContent: 'center', // Añadido para centrar texto verticalmente
  },
  qrButtonText: {
    color: "#FAFFFF",
    fontSize: 16, // Aumentado
    fontFamily: "BaiJamjuree",
  },
  qrBanner: {
    backgroundColor: '#E8F5E8',
    padding: 18, // Aumentado
    borderRadius: 10, // Aumentado
    marginBottom: 25, // Aumentado
    borderColor: '#C8E6C9',
    borderWidth: 1,
  },
  qrBannerTitle: {
    color: '#2E7D32',
    textAlign: 'center',
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 5,
    fontSize: 16, // Aumentado
  },
  qrBannerText: {
    color: '#2E7D32',
    textAlign: 'center',
    fontFamily: "BaiJamjuree",
    fontSize: 14, // Aumentado
  },
};