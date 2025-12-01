// components/HostVideoCall.jsx
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import io from 'socket.io-client';

const HostVideoCall = ({ callId, guestId, onEndCall, user }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false); // Inicialmente desactivada
  const [callStatus, setCallStatus] = useState('waiting-guest');
  
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Conectar al servidor de signaling
      socket.current = io('https://videoporteroqr-back.onrender.com');
      
      socket.current.emit('join-call-room', {
        callId,
        userType: 'host',
        userId: user.id
      });

      // Configurar WebRTC
      await setupWebRTC();

      // ✅ INICIALMENTE SOLO AUDIO PARA EL HOST
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false // Cámara desactivada inicialmente
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Añadir stream local al peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      setCallStatus('ready');

    } catch (error) {
      console.error('Error inicializando llamada:', error);
      Alert.alert('Error', 'No se pudo unir a la videollamada');
      onEndCall();
    }
  };

  const setupWebRTC = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Manejar stream remoto (guest)
    peerConnection.current.ontrack = (event) => {
      console.log('📹 Stream del guest recibido');
      const remoteStream = event.streams[0];
      setRemoteStream(remoteStream);
      setCallStatus('connected');
      setIsConnected(true);
    };

    // Manejar ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', {
          callId,
          candidate: event.candidate,
          userType: 'host'
        });
      }
    };

    // Manejar oferta del guest
    socket.current.on('offer', async (data) => {
      if (data.userType === 'guest') {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        
        // Crear answer
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        socket.current.emit('answer', {
          callId,
          answer,
          userType: 'host'
        });
      }
    });

    socket.current.on('ice-candidate', async (data) => {
      if (data.userType === 'guest') {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    });
  };

  const toggleCamera = async () => {
    if (!isCameraEnabled) {
      // Activar cámara
      try {
        const videoStream = await mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            frameRate: 30
          }
        });
        
        const videoTrack = videoStream.getVideoTracks()[0];
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
          
          // Reemplazar el track en el peer connection
          const sender = peerConnection.current.getSenders().find(
            s => s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else {
            peerConnection.current.addTrack(videoTrack, localStreamRef.current);
          }
        }
        
        setIsCameraEnabled(true);
        socket.current.emit('toggle-host-camera', { callId, enabled: true });
        
      } catch (error) {
        console.error('Error activando cámara:', error);
        Alert.alert('Error', 'No se pudo activar la cámara');
      }
    } else {
      // Desactivar cámara
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      }
      setIsCameraEnabled(false);
      socket.current.emit('toggle-host-camera', { callId, enabled: false });
    }
  };

  const toggleMicrophone = async () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (socket.current) {
      socket.current.emit('end-call', { callId });
      socket.current.disconnect();
    }
  };

  const endCall = () => {
    cleanup();
    onEndCall();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Videollamada con Guest</Text>
      
      <View style={styles.videoContainer}>
        {/* Video remoto (guest) - SIEMPRE visible */}
        {remoteStream ? (
          <View style={styles.remoteVideo}>
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.video}
              objectFit="cover"
            />
            <Text style={styles.videoLabel}>Guest</Text>
          </View>
        ) : (
          <View style={styles.connecting}>
            <Text style={styles.connectingText}>
              {callStatus === 'waiting-guest' ? 'Esperando guest...' : 'Conectando...'}
            </Text>
          </View>
        )}

        {/* Video local (host) - solo si la cámara está activada */}
        {isCameraEnabled && localStream && (
          <View style={styles.localVideo}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.video}
              objectFit="cover"
            />
            <Text style={styles.videoLabel}>Tú</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isCameraEnabled && styles.activeButton]} 
          onPress={toggleCamera}
        >
          <Text style={styles.controlText}>
            {isCameraEnabled ? '📷' : '📵'}
          </Text>
          <Text style={styles.controlLabel}>
            {isCameraEnabled ? 'Cámara ON' : 'Cámara OFF'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleMicrophone}>
          <Text style={styles.controlText}>🎤</Text>
          <Text style={styles.controlLabel}>Mic</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={endCall}>
          <Text style={styles.controlText}>📞</Text>
          <Text style={styles.controlLabel}>Colgar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          Estado: {isConnected ? 'Conectado' : callStatus}
        </Text>
        <Text style={styles.statusText}>
          Guest: {remoteStream ? 'Conectado' : 'Conectando...'}
        </Text>
        <Text style={styles.statusText}>
          Tu cámara: {isCameraEnabled ? 'Activada' : 'Desactivada'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  videoContainer: {
    flex: 1,
    marginBottom: 20,
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    zIndex: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
  videoLabel: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
  },
  audioOnly: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
  },
  audioOnlyText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  audioOnlySubtext: {
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connecting: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
  },
  connectingText: {
    color: 'white',
    fontSize: 18,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  status: {
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
});

export default HostVideoCall;