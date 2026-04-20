// components/HostVideoCallSimple.tsx - VERSIÓN MÍNIMA
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoCall } from '../context/VideoCallContext';

interface HostVideoCallSimpleProps {
  onEndCall: () => void;
}

const HostVideoCallSimple = ({ onEndCall }: HostVideoCallSimpleProps) => {
  const { callId, currentCall } = useVideoCall();
  const [isConnected, setIsConnected] = useState(false);
  
  const socket = useRef<any>(null);

  useEffect(() => {
    if (!callId) return;
    
    initializeCall();
    
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [callId]);

  const initializeCall = async () => {
    try {
      console.log("🔊 Inicializando llamada... ID:", callId);

      // Simular conexión exitosa después de 2 segundos
      setTimeout(() => {
        setIsConnected(true);
        console.log("✅ Simulación: Llamada conectada");
      }, 2000);

    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const handleEndCall = () => {
    if (socket.current) {
      socket.current.emit('end-call', { callId });
      socket.current.disconnect();
    }
    onEndCall();
  };

  if (!callId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No hay llamada activa</Text>
        <TouchableOpacity style={styles.button} onPress={handleEndCall}>
        <Text style={styles.buttonText}>Volver al panel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isConnected ? 'Llamada activa' : 'Conectando...'}
      </Text>
      
      <View style={styles.callContainer}>
        <Text style={styles.emoji}>🎤</Text>
        <Text style={styles.guestName}>
          {currentCall?.guestName || 'Invitado'}
        </Text>
        <Text style={styles.status}>
          {isConnected ? 'Conectado' : 'Estableciendo conexión...'}
        </Text>
        
        {isConnected && (
          <View style={styles.connectionInfo}>
            <Text style={styles.infoText}>Modo: comunicación de audio</Text>
            <Text style={styles.infoText}>La otra persona puede verte a través de su cámara</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={handleEndCall}>
      <Text style={styles.controlText}>Finalizar llamada</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debug}>
        <Text style={styles.debugText}>ID: {callId}</Text>
        <Text style={styles.debugText}>Versión sin cámara</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  callContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  guestName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  status: {
    color: '#4CAF50',
    fontSize: 16,
    marginBottom: 30,
  },
  connectionInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  controls: {
    padding: 20,
  },
  controlButton: {
    backgroundColor: '#ff4444',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  controlText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  debug: {
    alignItems: 'center',
    padding: 10,
  },
  debugText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#7D1522',
    padding: 15,
    borderRadius: 10,
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
