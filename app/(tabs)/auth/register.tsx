// app/(tabs)/auth/register.tsx - VERSIÓN ACTUALIZADA
import { router, useLocalSearchParams } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

export default function RegisterType() {
  const params = useLocalSearchParams();
  const qrCode = params.code as string;

  // Si viene con código QR, es registro de guest
  if (qrCode) {
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
        <Text style={styles.subtitle}>Te estás registrando como invitado usando un código QR</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push(`/register-guest?code=${qrCode}`)}
        >
          <Text style={styles.buttonText}>Continuar con Registro</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Sin código QR, elegir tipo de registro
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>Selecciona tu tipo de registro</Text>

      <View style={styles.optionContainer}>
        <Text style={styles.optionTitle}>¿Eres un Host?</Text>
        <Text style={styles.optionDescription}>
          Crea una sala y genera códigos QR para invitados
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push("/register-host")}
        >
          <Text style={styles.buttonText}>Registrarse como Host</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionContainer}>
        <Text style={styles.optionTitle}>¿Eres un Invitado?</Text>
        <Text style={styles.optionDescription}>
          Escanea un código QR para unirte a una sala
        </Text>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push("/qr/scan")} // ← CAMBIADO: Ahora va directo al scanner
        >
          <Text style={styles.secondaryButtonText}>Registrarse como Invitado</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.linkButton}
        onPress={() => router.push("/(tabs)/auth/login")}
      >
        <Text style={styles.linkButtonText}>Ya tengo cuenta - Iniciar Sesión</Text>
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
  },
  logo: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 25,
    marginBottom: 20,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 30,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
    lineHeight: 22,
  },
  optionContainer: {
    marginBottom: 30,
  },
  optionTitle: {
    fontSize: 20,
    marginBottom: 8,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  optionDescription: {
    color: '#666',
    marginBottom: 20,
    fontFamily: "BaiJamjuree",
    fontSize: 15,
    lineHeight: 20,
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
  buttonText: {
    color: "#FAFFFF",
    fontSize: 18,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
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
  linkButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    minHeight: 50,
    justifyContent: 'center',
  },
  linkButtonText: {
    color: "#7D1522",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
};