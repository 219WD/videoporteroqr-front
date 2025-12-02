// components/WebRTCVideoCall.tsx - VERSIÓN COMPATIBLE SDK 54
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import { useVideoCall } from '../context/VideoCallContext';

interface WebRTCVideoCallProps {
  userRole: 'host' | 'guest';
  callId: string;
}

// Configuración básica para WebRTC
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const WebRTCVideoCall: React.FC<WebRTCVideoCallProps> = ({ userRole, callId }) => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callStatus, setCallStatus] = useState('Inicializando...');
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<any>(null);
  const { leaveCall } = useVideoCall();

  useEffect(() => {
    initializeCall();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setCallStatus('Conectando...');
      
      // 1. Conectar al servidor de señalización
      connectToSignalingServer();
      
      // 2. Inicializar stream local
      await initLocalStream();
      
    } catch (error) {
      console.error('❌ Error inicializando llamada:', error);
      setCallStatus('Error de conexión');
      Alert.alert('Error', 'No se pudo iniciar la llamada');
    }
  };

  const connectToSignalingServer = () => {
    socket.current = io('https://videoporteroqr-back.onrender.com', {
      transports: ['websocket'],
      forceNew: true,
      timeout: 10000
    });

    socket.current.on('connect', () => {
      console.log('✅ Conectado al servidor');
      setCallStatus('Uniéndose a la sala...');
      joinCallRoom();
    });

    socket.current.on('disconnect', (reason: string) => {
      console.log('🔌 Desconectado:', reason);
      setCallStatus('Desconectado');
    });

    socket.current.on('call-response', (data: any) => {
      console.log('📞 Respuesta de llamada:', data);
      if (data.response === 'accept') {
        setCallStatus('Llamada aceptada, conectando...');
        startWebRTCConnection();
      } else if (data.response === 'reject') {
        Alert.alert('Llamada rechazada', 'El usuario ha rechazado la llamada');
        setCallStatus('Rechazada');
        setTimeout(() => leaveCall(), 2000);
      }
    });

    socket.current.on('offer', async (data: any) => {
      console.log('📥 Oferta recibida');
      await handleOffer(data.offer);
    });

    socket.current.on('answer', async (data: any) => {
      console.log('📥 Respuesta recibida');
      await handleAnswer(data.answer);
    });

    socket.current.on('ice-candidate', async (data: any) => {
      console.log('🧊 ICE candidate recibido');
      await handleIceCandidate(data.candidate);
    });

    socket.current.on('call-ended', () => {
      console.log('📞 Llamada finalizada');
      Alert.alert('Llamada finalizada', 'La llamada ha terminado');
      leaveCall();
    });

    socket.current.on('error', (error: any) => {
      console.error('❌ Error de socket:', error);
      setCallStatus('Error de conexión');
    });
  };

  const joinCallRoom = () => {
    if (socket.current && socket.current.connected) {
      socket.current.emit('join-call-room', {
        callId,
        userType: userRole,
        userId: userRole === 'host' ? 'host' : 'guest'
      });
      console.log(`✅ Unido a sala ${callId} como ${userRole}`);
      setCallStatus('Esperando conexión...');
    }
  };

  const initLocalStream = async () => {
    try {
      // Verificar permisos
      const cameraPermission = await mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Obtener stream con configuración básica para móvil
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
          facingMode: 'user'
        }
      });
      
      setLocalStream(stream);
      console.log('✅ Stream local obtenido');
      
      // Si es guest, iniciar conexión WebRTC después de obtener stream
      if (userRole === 'guest') {
        setTimeout(() => startWebRTCConnection(), 1000);
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo stream:', error);
      
      // Intentar solo audio si falla el video
      try {
        const audioStream = await mediaDevices.getUserMedia({ audio: true });
        setLocalStream(audioStream);
        console.log('✅ Stream de audio obtenido (video desactivado)');
        setIsVideoOn(false);
      } catch (audioError) {
        console.error('❌ Error obteniendo audio:', audioError);
        Alert.alert(
          'Permisos requeridos', 
          'Necesitas permitir acceso a cámara y micrófono para video llamadas'
        );
      }
    }
  };

  const startWebRTCConnection = async () => {
    try {
      setCallStatus('Creando conexión...');
      
      // Crear nueva conexión Peer
      peerConnection.current = new RTCPeerConnection(configuration);
      
      // Agregar stream local si existe
      if (localStream) {
        localStream.getTracks().forEach((track: any) => {
          if (peerConnection.current) {
            peerConnection.current.addTrack(track, localStream);
          }
        });
      }
      
      // Configurar manejadores de eventos
      peerConnection.current.ontrack = (event) => {
        console.log('✅ Stream remoto recibido');
        setRemoteStream(event.streams[0]);
        setCallStatus('Conectado');
      };
      
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket.current) {
          socket.current.emit('ice-candidate', {
            callId,
            candidate: event.candidate
          });
        }
      };
      
      peerConnection.current.oniceconnectionstatechange = () => {
        const state = peerConnection.current?.iceConnectionState;
        console.log('ICE connection state:', state);
        
        if (state === 'disconnected' || state === 'failed') {
          setCallStatus('Conexión perdida');
        }
      };
      
      // Si es guest, crear oferta
      if (userRole === 'guest') {
        await createOffer();
      }
      
    } catch (error) {
      console.error('❌ Error creando conexión WebRTC:', error);
      setCallStatus('Error de conexión WebRTC');
    }
  };

  const createOffer = async () => {
    try {
      if (!peerConnection.current) return;
      
      setCallStatus('Creando oferta...');
      const offer = await peerConnection.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.current.setLocalDescription(offer);
      
      // Enviar oferta al servidor
      if (socket.current) {
        socket.current.emit('offer', {
          callId,
          offer
        });
        console.log('📤 Oferta enviada');
        setCallStatus('Oferta enviada, esperando respuesta...');
      }
    } catch (error) {
      console.error('❌ Error creando oferta:', error);
    }
  };

  const handleOffer = async (offer: any) => {
    try {
      if (!peerConnection.current) return;
      
      setCallStatus('Procesando oferta...');
      await peerConnection.current.setRemoteDescription(offer);
      
      // Crear respuesta
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      // Enviar respuesta
      if (socket.current) {
        socket.current.emit('answer', {
          callId,
          answer
        });
        console.log('📤 Respuesta enviada');
      }
    } catch (error) {
      console.error('❌ Error manejando oferta:', error);
    }
  };

  const handleAnswer = async (answer: any) => {
    try {
      if (!peerConnection.current) return;
      
      await peerConnection.current.setRemoteDescription(answer);
      console.log('✅ Conexión WebRTC establecida');
      setCallStatus('Conectado');
    } catch (error) {
      console.error('❌ Error manejando respuesta:', error);
    }
  };

  const handleIceCandidate = async (candidate: any) => {
    try {
      if (!peerConnection.current || !candidate) return;
      
      await peerConnection.current.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ Error añadiendo ICE candidate:', error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🎤 Audio:', audioTrack.enabled ? 'ON' : 'OFF');
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        console.log('📹 Video:', videoTrack.enabled ? 'ON' : 'OFF');
      }
    }
  };

  const endCall = () => {
    Alert.alert(
      'Finalizar llamada',
      '¿Estás seguro de que quieres finalizar la llamada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Finalizar', 
          style: 'destructive',
          onPress: () => {
            if (socket.current) {
              socket.current.emit('end-call', { callId });
            }
            cleanup();
            leaveCall();
          }
        }
      ]
    );
  };

  const cleanup = () => {
    // Detener streams
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
    }
    
    // Cerrar conexión Peer
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Desconectar socket
    if (socket.current) {
      socket.current.disconnect();
    }
    
    // Limpiar estados
    setLocalStream(null);
    setRemoteStream(null);
  };

  // Renderizar interfaz
  return (
    <View style={styles.container}>
      {/* Video remoto (pantalla principal) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.remoteVideo}>
          <Text style={styles.placeholderText}>{callStatus}</Text>
          <Text style={styles.placeholderSubtext}>
            {userRole === 'host' ? 'Esperando invitado...' : 'Esperando anfitrión...'}
          </Text>
        </View>
      )}
      
      {/* Video local (pequeño, esquina) */}
      {localStream && isVideoOn && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          mirror={true}
        />
      )}
      
      {/* Indicador de estado */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {userRole === 'host' ? '🏠 Anfitrión' : '👤 Invitado'} • {callStatus}
        </Text>
      </View>
      
      {/* Controles */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleAudio}
        >
          <Text style={styles.controlIcon}>
            {isMuted ? '🔇' : '🎤'}
          </Text>
          <Text style={styles.controlLabel}>
            {isMuted ? 'Activar' : 'Silenciar'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Text style={styles.controlIcon}>
            {isVideoOn ? '📹' : '📵'}
          </Text>
          <Text style={styles.controlLabel}>
            {isVideoOn ? 'Apagar' : 'Encender'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Text style={[styles.controlIcon, styles.endCallIcon]}>📞</Text>
          <Text style={[styles.controlLabel, styles.endCallLabel]}>
            Finalizar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7D1522',
    backgroundColor: '#000',
    zIndex: 10,
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'BaiJamjuree-Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'BaiJamjuree',
    textAlign: 'center',
  },
  statusBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    backgroundColor: 'rgba(125, 21, 34, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontFamily: 'BaiJamjuree',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 70,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(125, 21, 34, 0.8)',
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'BaiJamjuree',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
  endCallIcon: {
    color: '#FFF',
  },
  endCallLabel: {
    color: '#FFF',
    fontFamily: 'BaiJamjuree-Bold',
  },
});

export default WebRTCVideoCall;