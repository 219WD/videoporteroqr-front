// app/qr/scan.tsx - VERSIÓN CON VIDEOCALL AUTOMÁTICO
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useContext, useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { useVideoCall } from "../../context/VideoCallContext";
import { api } from "../../utils/api";

// Icono de checkmark en SVG como componente
const CheckIcon = () => (
  <View style={styles.checkIcon}>
    <Text style={styles.checkIconText}>✓</Text>
  </View>
);

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const { user } = useContext(AuthContext);
  const { joinCall } = useVideoCall(); // ✅ Nuevo: contexto de videollamada

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.message}>Necesitamos permisos para usar la cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing) return;
    
    setScanning(false);
    setProcessing(true);
    
    try {
      // Extraer código QR
      let qrCode = data;
      try {
        const url = new URL(data);
        const urlParams = new URLSearchParams(url.search);
        qrCode = urlParams.get('code') || data;
      } catch (error) {
        // Si no es URL válida, usar el data directo
        qrCode = data;
      }

      if (!qrCode) {
        Alert.alert("Error", "QR no válido");
        setScanning(true);
        setProcessing(false);
        return;
      }

      setScannedCode(qrCode);
      console.log("📱 QR escaneado:", qrCode);

      // 🔥 NUEVA LÓGICA: Verificar si el usuario YA está logueado
      if (user) {
        // Usuario YA logueado - unirse automáticamente al host E INICIAR VIDEOCALL
        await joinHostAndStartVideoCall(qrCode);
      } else {
        // Usuario NO logueado - mostrar opciones
        setProcessing(false);
      }

    } catch (error) {
      console.error("Error procesando QR:", error);
      Alert.alert("Error", "Error al procesar el código QR");
      setScanning(true);
      setProcessing(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Unirse al host e iniciar videollamada automática
  const joinHostAndStartVideoCall = async (qrCode: string) => {
    try {
      console.log("📱 Usuario logueado, uniéndose al host e iniciando videollamada...");
      
      // 1. Unirse al host
      const joinResponse = await api.post(`/auth/join-host?code=${qrCode}`);
      
      // 2. Iniciar videollamada automática
      const videoCallResponse = await api.post('/videocall/start-automatic');
      const callId = videoCallResponse.data.callId;
      
      console.log("🎥 Videollamada iniciada con ID:", callId);
      
      // 3. Unirse a la videollamada como guest
      await joinCall(callId, user!.id, 'guest');
      
      // 4. Navegar directamente a la pantalla de videollamada
      router.replace("/video-call");
      
    } catch (error: any) {
      console.error("Error joining host or starting video call:", error);
      const errorMessage = error.response?.data?.error || "Error al unirse a la sala";
      
      if (errorMessage.includes("Ya estás en esta sala")) {
        // Si ya está en la sala, iniciar videollamada directamente
        Alert.alert(
          "Ya estás en esta sala",
          "¿Quieres iniciar una videollamada con el host?",
          [
            { 
              text: "Cancelar", 
              style: "cancel",
              onPress: () => {
                setProcessing(false);
                setScanning(true);
              }
            },
            { 
              text: "Iniciar Videollamada", 
              onPress: async () => {
                try {
                  const videoCallResponse = await api.post('/videocall/start-automatic');
                  const callId = videoCallResponse.data.callId;
                  await joinCall(callId, user!.id, 'guest');
                  router.replace("/video-call");
                } catch (videoError) {
                  Alert.alert("Error", "No se pudo iniciar la videollamada");
                  setProcessing(false);
                  setScanning(true);
                }
              }
            }
          ]
        );
      } else if (errorMessage.includes("Ya estás en otra sala")) {
        Alert.alert(
          "Atención",
          errorMessage,
          [
            { text: "Cancelar", style: "cancel" },
            { 
              text: "Salir y unirse", 
              onPress: () => leaveAndJoinWithVideoCall(qrCode)
            }
          ]
        );
      } else {
        Alert.alert("Error", errorMessage);
        setProcessing(false);
        setScanning(true);
      }
    }
  };

  // ✅ NUEVA FUNCIÓN: Salir de sala actual y unirse a nueva con videollamada
  const leaveAndJoinWithVideoCall = async (newQrCode: string) => {
    try {
      await api.post("/auth/leave-host");
      const joinResponse = await api.post(`/auth/join-host?code=${newQrCode}`);
      
      // Iniciar videollamada después de unirse
      const videoCallResponse = await api.post('/videocall/start-automatic');
      const callId = videoCallResponse.data.callId;
      
      await joinCall(callId, user!.id, 'guest');
      router.replace("/video-call");
      
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Error al cambiar de sala");
      setProcessing(false);
      setScanning(true);
    }
  };

  const handleRegister = () => {
    if (!scannedCode) return;
    router.push(`/register-guest?code=${scannedCode}`);
  };

  const handleLogin = () => {
    if (!scannedCode) return;
    router.push(`/(tabs)/auth/login?qrCode=${scannedCode}`);
  };

  const handleScanAgain = () => {
    setScanning(true);
    setScannedCode("");
    setProcessing(false);
  };

  // Si está procesando, mostrar loading
  if (processing) {
    return (
      <View style={styles.container}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#7D1522" />
        <Text style={[styles.message, { marginTop: 20 }]}>
          {user ? "Iniciando videollamada..." : "Procesando..."}
        </Text>
      </View>
    );
  }

  // Pantalla de resultados después de escanear (solo para usuarios NO logueados)
  if (!scanning && scannedCode && !user) {
    return (
      <View style={styles.resultContainer}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        
        <View style={styles.successHeader}>
          <CheckIcon />
          <Text style={styles.title}>QR Escaneado</Text>
        </View>
        
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>Código: {scannedCode}</Text>
        </View>
        <Text style={styles.message}>
          Te estás uniendo a una sala. Elige una opción:
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Registrarme como Invitado</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
            <Text style={styles.secondaryButtonText}>Ya tengo cuenta - Iniciar Sesión</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.outlineButton} onPress={handleScanAgain}>
            <Text style={styles.outlineButtonText}>Escanear otro código</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pantalla del scanner
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"]
        }}
      />
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Image 
            source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.overlayText}>
            {user ? "Escanear QR para iniciar videollamada" : "Escanea el código QR del host"}
          </Text>
        </View>
        <View style={styles.scanFrame} />
        <Text style={styles.instructions}>
          Encuadra el código QR dentro del marco
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: '#FAFFFF',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#3D3D3D',
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
    lineHeight: 22,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
    width: '100%',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'BaiJamjuree-Bold',
    paddingHorizontal: 20,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#7D1522',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: '#FAFFFF',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  checkIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkIconText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'BaiJamjuree-Bold',
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  codeContainer: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    width: '100%',
  },
  codeText: {
    fontSize: 16,
    color: '#3D3D3D',
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: "#7D1522",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButton: {
    backgroundColor: "#3D3D3D",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 60,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  outlineButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 50,
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: "#3D3D3D",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
});