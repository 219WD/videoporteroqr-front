// @ts-nocheck
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RTCIceCandidate, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import io from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { SOCKET_URL } from '../../utils/backend';
import { createCallPeerConnection, getLocalCallStream } from '../../utils/callWebRTC';

function getStringParam(value) {
  if (Array.isArray(value)) return value[0];
  return value || '';
}

function normalizeCall(payload) {
  if (!payload) return null;

  return {
    ...payload,
    caller: payload.caller || null,
    callee: payload.callee || null,
  };
}

export default function CallScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const callId = useMemo(() => getStringParam(params.callId), [params.callId]);
  const forcedRole = useMemo(() => getStringParam(params.role), [params.role]);

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('Cargando llamada...');
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(forcedRole !== 'callee');
  const [joining, setJoining] = useState(true);
  const [waitingAcceptance, setWaitingAcceptance] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [touchDebug, setTouchDebug] = useState('sin toques');

  const socketRef = useRef<any>(null);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const offerSentRef = useRef(false);
  const initializedRef = useRef(false);
  const pendingOfferRef = useRef<any>(null);

  const isCaller = useMemo(() => {
    if (!session || !user?.id) return forcedRole === 'caller';
    return session.caller?.id?.toString?.() === user.id.toString();
  }, [forcedRole, session, user?.id]);

  const isCallee = !isCaller;

  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch (error) {
        console.warn('[call] error cerrando peer:', error);
      }
      peerRef.current = null;
    }
  }, []);

  const leaveScreen = useCallback(async () => {
    cleanupMedia();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    router.replace('/messages');
  }, [cleanupMedia]);

  const sendEndCall = useCallback(async () => {
    if (!callId || ending) return;

    try {
      setEnding(true);
      await api.post(`/calls/sessions/${callId}/end`);
    } catch (error) {
      console.error('[call] error finalizando:', error);
    } finally {
      await leaveScreen();
    }
  }, [callId, ending, leaveScreen]);

  const ensurePeerConnection = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    const peer = createCallPeerConnection({
      onTrack: (event) => {
        if (event?.streams?.[0]) {
          setRemoteStream(event.streams[0]);
          setStatus('En llamada');
        }
      },
      onIceCandidate: (event) => {
        if (!event?.candidate || !socketRef.current || !remoteUserIdRef.current || !callId || !user?.id) {
          return;
        }

        socketRef.current.emit('call:ice-candidate', {
          callId,
          toUserId: remoteUserIdRef.current,
          fromUserId: user.id,
          candidate: event.candidate,
        });
      },
      onConnectionStateChange: () => {
        const state = peer.connectionState;
        if (state === 'connected') {
          setStatus('En llamada');
        } else if (state === 'failed' || state === 'disconnected') {
          setStatus('Conexión perdida');
        }
      },
    });

    peerRef.current = peer;

    return peer;
  }, [callId, user?.id]);

  const attachLocalStreamToPeer = useCallback((stream) => {
    const peer = ensurePeerConnection();
    if (!peer || !stream) return;

    const existingKinds = new Set(
      (peer.getSenders?.() || [])
        .map((sender) => sender?.track?.kind)
        .filter(Boolean),
    );

    stream.getTracks().forEach((track) => {
      if (existingKinds.has(track.kind)) {
        console.log('[call] track already attached, skipping', {
          callId,
          kind: track.kind,
        });
        return;
      }

      peer.addTrack(track, stream);
      console.log('[call] local track attached', {
        callId,
        kind: track.kind,
      });
    });
  }, [callId, ensurePeerConnection]);

  const createAndSendOffer = useCallback(async () => {
    if (!socketRef.current || !remoteUserIdRef.current || !callId || !user?.id) return;
    if (!localStreamRef.current) return;
    const peer = ensurePeerConnection();
    if (!peer || offerSentRef.current) return;

    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peer.setLocalDescription(offer);
    offerSentRef.current = true;
    setStatus('Enviando señal...');

    socketRef.current.emit('call:offer', {
      callId,
      toUserId: remoteUserIdRef.current,
      fromUserId: user.id,
      offer: peer.localDescription || offer,
    });
  }, [callId, ensurePeerConnection, user?.id]);

  useEffect(() => {
    if (!isCaller || !accepted || offerSentRef.current || !localStreamRef.current || !socketRef.current) {
      return;
    }

    createAndSendOffer().catch((error) => {
      console.error('[call] error creando offer por efecto:', error);
    });
  }, [accepted, createAndSendOffer, isCaller, localStream]);

  const acceptCall = useCallback(async () => {
    if (!callId || !session) return;

    try {
      setTouchDebug(`accept pressed ${new Date().toLocaleTimeString()}`);
      console.log('[call] accept pressed', {
        callId,
        userId: user?.id,
        sessionStatus: session?.status,
      });
      setWaitingAcceptance(true);
      await api.post(`/calls/sessions/${callId}/accept`);
      setAccepted(true);
      setStatus('Conectando...');
    } catch (error: any) {
      console.error('[call] error aceptando:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo aceptar la llamada');
    } finally {
      setWaitingAcceptance(false);
    }
  }, [callId, session]);

  const rejectCall = useCallback(async () => {
    if (!callId) return;

    try {
      setTouchDebug(`reject pressed ${new Date().toLocaleTimeString()}`);
      console.log('[call] reject pressed', {
        callId,
        userId: user?.id,
        sessionStatus: session?.status,
      });
      await api.post(`/calls/sessions/${callId}/reject`);
    } catch (error) {
      console.error('[call] error rechazando:', error);
    } finally {
      await leaveScreen();
    }
  }, [callId, leaveScreen]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!callId || !user?.id || initializedRef.current) return;
      initializedRef.current = true;

      try {
        setJoining(true);
        const response = await api.get(`/calls/sessions/${callId}`);
        if (!mounted) return;

        const loaded = normalizeCall(response.data.call);
        setSession(loaded);
        remoteUserIdRef.current = isCaller ? loaded?.callee?.id?.toString?.() || loaded?.callee?.id : loaded?.caller?.id?.toString?.() || loaded?.caller?.id;

        setStatus(isCaller ? 'Llamando...' : 'Llamada entrante');
        setWaitingAcceptance(false);
        setAccepted(loaded?.status === 'accepted');

        const socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          forceNew: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('user-connected', {
            userId: user.id,
            userType: user.role,
          });

          socket.emit('call:join-room', {
            callId,
            userId: user.id,
            role: isCaller ? 'caller' : 'callee',
          });
        });

        socket.on('call:room-joined', (payload) => {
          if (payload?.callId !== callId) return;
          setStatus((current) => current === 'Cargando llamada...' ? 'Conectado' : current);
        });

        socket.on('call:accepted', async (payload) => {
          if (payload?.callId !== callId) return;
          setSession(normalizeCall(payload));
          setAccepted(true);
          setWaitingAcceptance(false);
          setStatus('Conectando...');

          remoteUserIdRef.current = payload?.callee?.id?.toString?.() === user.id.toString()
            ? payload?.caller?.id?.toString?.() || payload?.caller?.id
            : payload?.callee?.id?.toString?.() || payload?.callee?.id;
        });

        socket.on('call:rejected', (payload) => {
          if (payload?.callId !== callId) return;
          Alert.alert('Llamada rechazada', 'El otro usuario rechazó la llamada');
          leaveScreen();
        });

        const handleCallEnded = (payload) => {
          if (payload?.callId !== callId) return;
          if (payload?.status === 'timeout') return;

          Alert.alert('Llamada finalizada', 'La llamada terminó');
          leaveScreen();
        };

        const handleCallTimeout = (payload) => {
          if (payload?.callId !== callId) return;
          const status = payload?.status;
          const title = status === 'timeout' ? 'Llamada perdida' : 'Llamada finalizada';
          const message = status === 'timeout' ? 'No fue contestada a tiempo' : 'La llamada terminó';
          Alert.alert(title, message);
          leaveScreen();
        };

        socket.on('call:ended', handleCallEnded);
        socket.on('call:timeout', handleCallTimeout);

        socket.on('call:offer', async (payload) => {
          if (payload?.callId !== callId || isCaller) return;
          if (!payload.offer) return;

          if (!localStreamRef.current) {
            pendingOfferRef.current = payload.offer;
            setStatus('Esperando cámara para responder...');
            return;
          }

          const peer = ensurePeerConnection();
          await peer.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit('call:answer', {
            callId,
            toUserId: remoteUserIdRef.current,
            fromUserId: user.id,
            answer: peer.localDescription || answer,
          });

          setStatus('Conectando...');
        });

        socket.on('call:answer', async (payload) => {
          if (payload?.callId !== callId || !isCaller) return;
          if (!payload.answer) return;

          const peer = ensurePeerConnection();
          await peer.setRemoteDescription(new RTCSessionDescription(payload.answer));
          setStatus('En llamada');
        });

        socket.on('call:ice-candidate', async (payload) => {
          if (payload?.callId !== callId || !payload.candidate) return;

          const peer = ensurePeerConnection();
          try {
            await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (error) {
            console.warn('[call] error agregando ICE candidate:', error);
          }
        });

        setJoining(false);
        ensurePeerConnection();

        getLocalCallStream()
          .then((stream) => {
            if (!mounted) return;

            localStreamRef.current = stream;
            setLocalStream(stream);
            attachLocalStreamToPeer(stream);

            if (!isCaller) {
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.enabled = false;
              }
              setVideoEnabled(false);
            }

            if (pendingOfferRef.current && !isCaller) {
              const offer = pendingOfferRef.current;
              pendingOfferRef.current = null;

              const peer = ensurePeerConnection();
              peer.setRemoteDescription(new RTCSessionDescription(offer))
                .then(() => peer.createAnswer())
                .then((answer) => peer.setLocalDescription(answer))
                .then(() => {
                  socketRef.current?.emit('call:answer', {
                    callId,
                    toUserId: remoteUserIdRef.current,
                    fromUserId: user.id,
                    answer: peer.localDescription,
                  });
                })
                .catch((error) => {
                  console.error('[call] error procesando offer pendiente:', error);
                });
            }

            if (isCaller && loaded?.status === 'accepted') {
              createAndSendOffer().catch((error) => {
                console.error('[call] error creando offer tras stream:', error);
              });
            }
          })
          .catch((streamError) => {
            console.error('[call] error obteniendo stream local:', streamError);
            if (mounted) {
              setStatus('Sin acceso a cámara o micrófono');
            }
          });
      } catch (error) {
        console.error('[call] bootstrap error:', error);
        Alert.alert('Error', 'No se pudo iniciar la llamada');
        await leaveScreen();
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [attachLocalStreamToPeer, callId, createAndSendOffer, ensurePeerConnection, isCaller, leaveScreen, user?.id, user?.role]);

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
  };

  const remoteStreamUrl = remoteStream?.toURL ? remoteStream.toURL() : null;
  const localStreamUrl = localStream?.toURL ? localStream.toURL() : null;
  const remoteLabel = isCaller ? session?.callee?.name || 'Contacto' : session?.caller?.name || 'Contacto';

  return (
    <View style={styles.container}>
      {remoteStreamUrl ? (
        <View style={styles.remoteVideoWrap} pointerEvents="none">
          <RTCView style={styles.remoteVideo} streamURL={remoteStreamUrl} objectFit="cover" />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.statusText}>{status}</Text>
          <Text style={styles.placeholderText}>
            {isCaller ? 'Esperando respuesta del contacto...' : 'Esperando señal de conexión...'}
          </Text>
          <Text style={styles.remoteLabel}>{remoteLabel}</Text>
        </View>
      )}

      {localStreamUrl ? (
        <View style={styles.localVideoWrap} pointerEvents="none">
          <RTCView style={styles.localVideo} streamURL={localStreamUrl} objectFit="cover" mirror />
        </View>
      ) : null}

      <View style={styles.topStatus}>
        <Text style={styles.topStatusText}>
          {session?.status?.toUpperCase?.() || 'LLAMADA'} • {status}
        </Text>
        <Text style={styles.touchDebugText}>{touchDebug}</Text>
      </View>

      <View style={styles.controls}>
        {isCallee && !accepted ? (
          <>
            <TouchableOpacity
              style={[styles.controlButton, styles.acceptButton]}
              onPressIn={() => {
                setTouchDebug(`accept pressIn ${new Date().toLocaleTimeString()}`);
                console.log('[call] accept press in', {
                  callId,
                  userId: user?.id,
                  status: session?.status,
                });
              }}
              onPress={acceptCall}
              disabled={waitingAcceptance}
            >
              <Ionicons name="videocam" size={22} color="#FAFFFF" />
              <Text style={styles.controlLabel}>Aceptar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.rejectButton]}
              onPressIn={() => {
                setTouchDebug(`reject pressIn ${new Date().toLocaleTimeString()}`);
                console.log('[call] reject press in', {
                  callId,
                  userId: user?.id,
                  status: session?.status,
                });
              }}
              onPress={rejectCall}
              disabled={waitingAcceptance}
            >
              <Ionicons name="close" size={22} color="#FAFFFF" />
              <Text style={styles.controlLabel}>Rechazar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.controlButton, muted && styles.controlButtonActive]} onPress={toggleAudio}>
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#FAFFFF" />
              <Text style={styles.controlLabel}>{muted ? 'Activar' : 'Silenciar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, !videoEnabled && styles.controlButtonActive]} onPress={toggleVideo}>
              <Ionicons name={videoEnabled ? 'videocam' : 'videocam-off'} size={22} color="#FAFFFF" />
              <Text style={styles.controlLabel}>{videoEnabled ? 'Video' : 'Sin video'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={sendEndCall} disabled={ending}>
              <Ionicons name="call" size={22} color="#FAFFFF" />
              <Text style={styles.controlLabel}>{ending ? 'Saliendo...' : 'Colgar'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {joining ? (
        <View style={styles.joiningOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FAFFFF" />
        </View>
      ) : null}
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
    backgroundColor: '#000',
  },
  remoteVideoWrap: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#111',
  },
  statusText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  placeholderText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    textAlign: 'center',
  },
  remoteLabel: {
    marginTop: 16,
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 16,
  },
  localVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  localVideoWrap: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 110,
    height: 150,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FAFFFF',
    backgroundColor: '#222',
    overflow: 'hidden',
    zIndex: 10,
    elevation: 10,
  },
  topStatus: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
    elevation: 30,
  },
  topStatusText: {
    color: '#FAFFFF',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
  },
  controls: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    zIndex: 40,
    elevation: 40,
  },
  controlButton: {
    minWidth: 92,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    gap: 6,
    zIndex: 50,
    elevation: 50,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(125, 21, 34, 0.9)',
  },
  acceptButton: {
    backgroundColor: '#1E8E5A',
  },
  rejectButton: {
    backgroundColor: '#B3261E',
  },
  endButton: {
    backgroundColor: '#7D1522',
  },
  controlLabel: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
  },
  joiningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    elevation: 60,
  },
  touchDebugText: {
    marginTop: 8,
    color: '#FAFFFF',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontFamily: 'BaiJamjuree',
    fontSize: 11,
  },
});
