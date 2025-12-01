// app/video-call.tsx - PANTALLA BÁSICA DE VIDEOCALL
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useVideoCall } from "../context/VideoCallContext";

export default function VideoCallScreen() {
  const { 
    isInCall, 
    callId, 
    leaveCall, 
    toggleCamera, 
    toggleAudio, 
    isCameraEnabled, 
    isAudioEnabled 
  } = useVideoCall();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎥 Videollamada Activa</Text>
      
      <View style={styles.callInfo}>
        <Text style={styles.callId}>ID: {callId}</Text>
        <Text style={styles.status}>
          Estado: {isInCall ? "Conectado" : "Desconectado"}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isCameraEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
          onPress={toggleCamera}
        >
          <Text style={styles.controlText}>
            {isCameraEnabled ? "📷 Cámara ON" : "📷 Cámara OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, isAudioEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
          onPress={toggleAudio}
        >
          <Text style={styles.controlText}>
            {isAudioEnabled ? "🎤 Audio ON" : "🎤 Audio OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.endCallButton}
          onPress={() => {
            leaveCall();
            router.back();
          }}
        >
          <Text style={styles.endCallText}>📞 Finalizar Llamada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    marginBottom: 30,
  },
  callInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  callId: {
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#28a745',
    fontFamily: 'BaiJamjuree-Bold',
  },
  controls: {
    gap: 15,
  },
  controlButton: {
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#7D1522',
  },
  buttonDisabled: {
    backgroundColor: '#B8B8B8',
  },
  controlText: {
    color: '#FAFFFF',
    fontSize: 16,
    fontFamily: 'BaiJamjuree-Bold',
  },
  endCallButton: {
    backgroundColor: '#DC3545',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  endCallText: {
    color: '#FAFFFF',
    fontSize: 16,
    fontFamily: 'BaiJamjuree-Bold',
  },
});