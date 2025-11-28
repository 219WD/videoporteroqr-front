// app/register-host.tsx - VERSIÓN ACTUALIZADA
import { router } from "expo-router";
import { useContext, useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../context/AuthContext";

export default function RegisterHost() {
  const { registerHost } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState("");

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const host = await registerHost(form.name, form.email, form.password);
      
      // Si el host tiene QR data, mostrarlo
      if (host.qrDataUrl) {
        setQrData(host.qrDataUrl);
      } else {
        Alert.alert(
          "¡Host registrado!", 
          "Tu cuenta ha sido creada exitosamente",
          [
            { 
              text: "OK", 
              onPress: () => router.back() 
            }
          ]
        );
      }
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
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {qrData ? (
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>¡Tu QR está listo!</Text>
          <Image 
            source={{ uri: qrData }} 
            style={styles.qrImage}
          />
          <Text style={styles.qrDescription}>
            Los invitados pueden escanear este código QR para unirse a tu sala
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Volver al Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.title}>Registrar Host</Text>

          <Text style={styles.label}>Nombre del Host</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            placeholder="Ej: Sala de Conferencias A"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            autoCapitalize="none"
            placeholder="host@ejemplo.com"
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
            <Text style={styles.buttonText}>
              {loading ? "Registrando..." : "Registrar Host"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAFFFF",
  },
  logoContainer: {
    alignItems: "center",
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
  qrContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  qrTitle: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  qrImage: {
    width: 280,
    height: 280,
    marginBottom: 25,
    borderRadius: 12,
  },
  qrDescription: {
    textAlign: 'center',
    marginBottom: 30,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
};