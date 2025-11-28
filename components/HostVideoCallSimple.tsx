// components/HostVideoCallSimple.tsx - VERSIÓN CON expo-camera
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import io from 'socket.io-client';
import { useVideoCall } from '../context/VideoCallContext';

interface HostVideoCallSimpleProps {
  onEndCall: () => void;
}

const HostVideoCallSimple = ({ onEndCall }: HostVideoCallSimpleProps) => {
  const { callId, currentCall } = useVideoCall();
  const [isConnected, setIsConnected] = useState(false);
  const [callStatus, setCallStatus] = useState('initializing');
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [permission, requestPermission] = useCameraPermissions();
  
  const socket = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!callId) return;
    
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, [callId]);

  const initializeCall = async () => {
    try {
      console.log("🎥 Inicializando videollamada... ID:", callId);

      // Configurar audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      setCallStatus('connecting_signaling');

      // Conectar Socket.io
      socket.current = io('https://videoporteroqr-back.onrender.com', {
        transports: ['websocket']
      });
      
      // Unirse a sala
      socket.current.emit('join-call-room', {
        callId,
        userType: 'host', 
        userId: currentCall?.hostId
      });

      // Configurar listeners
      setupSocketListeners();

      setCallStatus('ready');

    } catch (error) {
      console.error('❌ Error inicializando videollamada:', error);
      Alert.alert('Error', 'No se pudo iniciar la videollamada');
      handleEndCall();
    }
  };

  const setupSocketListeners = () => {
    socket.current.on('user-joined', (data: any) => {
      console.log('✅ Guest se unió a la sala');
      setIsConnected(true);
      setCallStatus('connected');
    });

    socket.current.on('call-connected', (data: any) => {
      console.log('✅ Conexión establecida con guest');
      setIsConnected(true);
      setCallStatus('connected');
    });

    socket.current.on('call-ended', () => {
      console.log("📞 Llamada finalizada por guest");
      Alert.alert("Llamada finalizada", "El invitado ha colgado");
      handleEndCall();
    });

    socket.current.on('error', (error: any) => {
      console.error("❌ Error en socket:", error);
    });
  };

  const toggleCamera = () => {
    setIsCameraEnabled(!isCameraEnabled);
  };

  const toggleMicrophone = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'front' ? 'back' : 'front'));
  };

  const cleanup = () => {
    if (socket.current) {
      socket.current.emit('end-call', { callId });
      socket.current.disconnect();
    }
  };

  const handleEndCall = () => {
    console.log("📞 Colgando llamada...");
    cleanup();
    onEndCall();
  };

  // Estados de permisos
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Solicitando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Se necesitan permisos de cámara</Text>
        <Text style={styles.subtitle}>
          Esta app necesita acceso a tu cámara para funcionar como videoportero
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permisos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!callId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No hay llamada activa</Text>
        <TouchableOpacity style={styles.button} onPress={handleEndCall}>
          <Text style={styles.buttonText}>Volver al Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isConnected ? '🎥 Videoportero Activo' : '🔔 Conectando...'}
      </Text>
      
      <View style={styles.videoContainer}>
        {isCameraEnabled ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mode="video" // Modo video para mejor calidad
          >
            <View style={styles.cameraOverlay}>
              <Text style={styles.overlayText}>
                {isConnected ? 'EN VIVO' : 'PREVIEW'}
              </Text>
              <Text style={styles.overlaySubtext}>
                {currentCall?.guestName || 'Invitado'}
              </Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.cameraDisabled}>
            <Text style={styles.cameraDisabledText}>📷 Cámara desactivada</Text>
            <Text style={styles.cameraDisabledSubtext}>
              El guest no puede verte
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isCameraEnabled ? styles.buttonActive : styles.buttonInactive]} 
          onPress={toggleCamera}
        >
          <Text style={styles.controlText}>
            {isCameraEnabled ? '📷' : '❌'}
          </Text>
          <Text style={styles.controlLabel}>
            {isCameraEnabled ? 'Cámara' : 'Sin Cámara'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, isAudioEnabled ? styles.buttonActive : styles.buttonInactive]} 
          onPress={toggleMicrophone}
        >
          <Text style={styles.controlText}>
            {isAudioEnabled ? '🎤' : '🔇'}
          </Text>
          <Text style={styles.controlLabel}>
            {isAudioEnabled ? 'Audio' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={toggleCameraFacing}
        >
          <Text style={styles.controlText}>🔄</Text>
          <Text style={styles.controlLabel}>Cambiar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={handleEndCall}>
          <Text style={styles.controlText}>📞</Text>
          <Text style={styles.controlLabel}>Colgar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Estado: {isConnected ? 'CONECTADO ✅' : callStatus}
        </Text>
        <Text style={styles.infoText}>
          Visitante: {currentCall?.guestName || 'Invitado Web'}
        </Text>
        <Text style={styles.infoNote}>
          ID de llamada: {callId}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 15,
    paddingTop: 40,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  videoContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(125, 21, 34, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  overlaySubtext: {
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cameraDisabled: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  cameraDisabledText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cameraDisabledSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  controlButton: {
    width: 65,
    height: 65,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonActive: {
    backgroundColor: '#333',
  },
  buttonInactive: {
    backgroundColor: '#666',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  controlText: {
    fontSize: 22,
    color: 'white',
  },
  controlLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
  info: {
    alignItems: 'center',
    padding: 15,
    paddingBottom: 25,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  infoNote: {
    color: '#666',
    fontSize: 10,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#7D1522',
    padding: 15,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FAFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HostVideoCallSimple;