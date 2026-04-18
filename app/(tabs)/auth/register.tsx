import { router } from "expo-router";
import { useContext, useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../../context/AuthContext";

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password, "host");

      Alert.alert("Cuenta creada", "Ya puedes ingresar con tus credenciales", [
        {
          text: "OK",
          onPress: () => {
            if (user?.role === "admin") {
              router.replace("/dashboard/admin");
            } else {
              router.replace("/dashboard/host");
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("Register error:", error);
      Alert.alert("Error", error.response?.data?.error || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: "https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png" }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Registrarse</Text>
      <Text style={styles.subtitle}>Crea tu acceso para usar la app</Text>

      <Text style={styles.label}>Nombre completo</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(text) => setForm({ ...form, name: text })}
        placeholder="Tu nombre"
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

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
        placeholder="Mínimo 6 caracteres"
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Registrando..." : "Crear cuenta"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/(tabs)/auth/login")}
      >
        <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
      </TouchableOpacity>
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
    marginBottom: 18,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 30,
    marginBottom: 8,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    fontFamily: "BaiJamjuree",
    fontSize: 15,
    marginBottom: 24,
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
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
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
