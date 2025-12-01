// components/RealVideoCall.tsx
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoCall } from '../context/VideoCallContext';

export default function RealVideoCall() {
  const { callId, guestData, leaveCall, currentCall } = useVideoCall();
  const [callStatus, setCallStatus] = useState('connecting');

  useEffect(() => {
    // Iniciar llamada real aquí
    initializeRealCall();
  }, []);

  const initializeRealCall = async () => {
    try {
      console.log("🎥 Iniciando llamada REAL con:", guestData);
      
      // Aquí iría la implementación real de WebRTC
      // Por ahora simulamos una llamada funcional
      
      setTimeout(() => {
        setCallStatus('connected');
        Alert.alert(
          "Llamada Conectada", 
          `Estás hablando con ${guestData?.name || 'Invitado'}`,
          [{ text: "OK" }]
        );
      }, 2000);
      
    } catch (error) {
      console.error("Error en llamada real:", error);
      setCallStatus('error');
    }
  };

  const toggleAudio = () => {
    Alert.alert("Audio", "Funcionalidad de audio disponible");
  };

  const toggleVideo = () => {
    Alert.alert("Video", "Funcionalidad de video disponible");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎥 Videollamada en Curso</Text>
      
      <View style={styles.videoContainer}>
        <View style={styles.remoteVideo}>
          <Text style={styles.videoPlaceholder}>
            {guestData?.name || 'Invitado'}
          </Text>
          <Text style={styles.status}>
            {callStatus === 'connected' ? '✅ Conectado' : '🔄 Conectando...'}
          </Text>
        </View>
        
        <View style={styles.localVideo}>
          <Text style={styles.videoPlaceholder}>Tú</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleAudio}>
          <Text style={styles.controlText}>🎤</Text>
          <Text style={styles.controlLabel}>Audio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Text style={styles.controlText}>📹</Text>
          <Text style={styles.controlLabel}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={leaveCall}>
          <Text style={styles.controlText}>📞</Text>
          <Text style={styles.controlLabel}>Colgar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>ID: {callId}</Text>
        <Text style={styles.infoText}>Conectado con: {guestData?.name}</Text>
        <Text style={styles.infoNote}>
          Versión demo - Audio/Video real requiere WebRTC nativo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  videoContainer: {
    flex: 1,
    marginBottom: 20,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    color: '#4CAF50',
    marginTop: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  controlText: {
    fontSize: 24,
  },
  controlLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  info: {
    alignItems: 'center',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  infoNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});