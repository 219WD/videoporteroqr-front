import { router } from "expo-router";
import { useContext, useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../../context/AuthContext";

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);

      if (user.role === "admin") router.replace("/dashboard/admin");
      else router.replace("/dashboard/host");
    } catch (error) {
      console.log("Login error:", error);
      Alert.alert("Error", "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: "https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png" }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Ingresar</Text>
      <Text style={styles.subtitle}>Accede con tu cuenta de la app</Text>

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
          {loading ? "Iniciando sesión..." : "Ingresar"}
        </Text>
      </TouchableOpacity>

      <View style={styles.secondaryButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/(tabs)/auth/register")}>
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>
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
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
    fontFamily: "BaiJamjuree",
    fontSize: 15,
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
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#B8B8B8",
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 18,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButtons: {
    marginTop: 10,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
};
