// app/video-call/host.tsx
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import io from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { createPeerConnection } from '../../utils/webrtc';

export default function HostVideoCallScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const { callId, guestName } = params;

  const [socket, setSocket] = useState<any>(null);
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('Conectando...');
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  useEffect(() => {
    // Conectar socket
    const newSocket = io('https://videoporteroqr-back.onrender.com', {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Conectado al servidor');
      // Unirse a la sala como host
      newSocket.emit('join-call-room', {
        callId,
        userId: user?.id,
        userRole: 'host'
      });
      setStatus('Esperando al visitante...');
    });

    newSocket.on('user-joined', (data) => {
      if (data.userRole === 'guest') {
        setStatus('Visitante conectado. Iniciando videollamada...');
      }
    });

    newSocket.on('call-offer', (data) => {
      console.log('Recibiendo oferta del guest');
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(data.offer))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            newSocket.emit('answer', {
              answer: pc.localDescription,
              roomId: callId
            });
          });
      }
    });

    newSocket.on('ice-candidate', (data) => {
      if (pc && data.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    newSocket.on('call-ended', () => {
      Alert.alert('Llamada finalizada', 'El visitante ha colgado.');
      endCall();
    });

    setSocket(newSocket);

    // Iniciar stream local
    startLocalStream();

    return () => {
      newSocket.disconnect();
      cleanup();
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      const newPc = createPeerConnection(socket, callId);
      stream.getTracks().forEach(track => newPc.addTrack(track, stream));
      setPc(newPc);

      newPc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setStatus('Conectado');
      };
    } catch (err) {
      console.error('Error al iniciar stream:', err);
      setStatus('Error en cámara/mic');
    }
  };

  const endCall = () => {
    socket.emit('end-call', { callId });
    cleanup();
    router.back();
  };

  const cleanup = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (pc) pc.close();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !muted;
      setMuted(!muted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !cameraEnabled;
      setCameraEnabled(!cameraEnabled);
    }
  };

  return (
    <View style={styles.container}>
      <RTCView streamURL={remoteStream} style={styles.remoteVideo} />
      <RTCView streamURL={localStream} style={styles.localVideo} muted />

      <Text style={styles.status}>{status}</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={toggleMute}>
          <Text>{muted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={toggleCamera}>
          <Text>{cameraEnabled ? '📹' : '📷'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endBtn} onPress={endCall}>
          <Text>📞 Colgar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 150,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  status: {
    position: 'absolute',
    top: 20,
    left: 20,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 50,
  },
  endBtn: {
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 50,
  },
});