import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import io from 'socket.io-client';
import { api } from '../../utils/api';
import { SOCKET_URL } from '../../utils/backend';

type FlowMessage = {
  sender: 'host' | 'guest';
  message: string;
  timestamp: string;
  guestName?: string;
};

type FlowDetail = {
  _id: string;
  guestName: string;
  hostId: string;
  status: string;
  response?: string | null;
  actionType: 'message' | 'call' | 'direct_call';
  callType?: string;
  messageContent?: string | null;
  isAnonymous?: boolean;
  createdAt?: string;
  answeredAt?: string | null;
  messages?: FlowMessage[];
  timeoutIn?: number;
};

function formatTime(ms?: number | null) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatClock(dateString?: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnonymousFlowScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const callId = useMemo(() => {
    const value = params.callId;
    return Array.isArray(value) ? value[0] : value;
  }, [params.callId]);

  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [messages, setMessages] = useState<FlowMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftMs((current) => Math.max(0, current - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadFlow = useCallback(async () => {
    if (!callId) return;

    try {
      setLoading(true);
      const statusResponse = await api.get(`/flows/status/${encodeURIComponent(callId)}`);
      const nextFlow = statusResponse.data?.call || null;
      setFlow(nextFlow);
      setTimeLeftMs(Number(statusResponse.data?.timeoutIn || 0));

      const messagesResponse = await api.get(`/flows/${encodeURIComponent(callId)}/messages`);
      setMessages(messagesResponse.data?.messages || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo cargar el flujo');
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useFocusEffect(
    useCallback(() => {
      loadFlow();
    }, [loadFlow]),
  );

  useEffect(() => {
    let active = true;

    async function connectSocket() {
      if (!user?.id || !callId) return;

      const token = await AsyncStorage.getItem('token');
      if (!active || !token) return;

      const socket = io(SOCKET_URL, {
        auth: { token },
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
      });

      socket.on('new-flow-message', (payload: any) => {
        if (!payload?.callId || payload.callId !== callId || !payload?.message) return;

        setMessages((current) => {
          const exists = current.some(
            (item) =>
              item.timestamp === payload.timestamp &&
              item.sender === payload.sender &&
              item.message === payload.message,
          );

          if (exists) return current;

          return [
            ...current,
            {
              sender: payload.sender,
              message: payload.message,
              timestamp: payload.timestamp,
              guestName: payload.guestName,
            },
          ];
        });
      });

      socket.on('flow-response', (payload: any) => {
        if (payload?.callId !== callId) return;
        setFlow((current) =>
          current
            ? {
                ...current,
                status: payload.response === 'accept' ? 'answered' : 'rejected',
                response: payload.response,
              }
            : current,
        );

        if (payload.response === 'reject') {
          setError('La otra persona rechazó la conversación');
        }
      });

      socket.on('flow-host-accepted', (payload: any) => {
        if (payload?.callId !== callId) return;
        setFlow((current) =>
          current
            ? {
                ...current,
                status: 'answered',
                response: 'accept',
              }
            : current,
        );
      });
    }

    connectSocket();

    return () => {
      active = false;
      socketRef.current?.disconnect?.();
    };
  }, [callId, user?.id, user?.role]);

  const expired = timeLeftMs <= 0;
  const actionType = flow?.actionType || 'message';

  async function sendMessage() {
    const text = message.trim();
    if (!text || expired || !callId) return;

    try {
      setSending(true);
      const response = await api.post(`/flows/${encodeURIComponent(callId)}/send-message`, {
        message: text,
        sender: 'host',
      });

      setMessages(response.data?.messages || []);
      setMessage('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  async function respond(response: 'accept' | 'reject') {
    if (!callId) return;

    try {
      setReplying(true);
      const result = await api.post('/flows/respond', {
        callId,
        response,
      });

      setFlow((current) =>
        current
          ? {
              ...current,
              status: response === 'accept' ? 'answered' : 'rejected',
              response,
            }
          : current,
      );

      if (response === 'reject') {
        setError('Conversación rechazada');
      } else if (result.data?.call?.actionType === 'call') {
        setError(null);
        router.push({
          pathname: '/calls/[callId]',
          params: {
            callId,
            role: 'host',
            anonymous: '1',
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo responder');
    } finally {
      setReplying(false);
    }
  }

  const visibleMessages = useMemo(() => messages, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#3D3D3D" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{flow?.guestName || 'Conversación anónima'}</Text>
          <Text style={styles.headerSubtitle}>
            {expired ? 'La conversación terminó' : `Restan ${formatTime(timeLeftMs)}`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{actionType === 'call' ? 'Videollamada' : 'Chat'}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando conversación...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>{actionType === 'call' ? 'Videollamada anónima' : 'Chat anónimo'}</Text>
            <Text style={styles.statusText}>
              {flow?.messageContent
                ? flow.messageContent
                : flow?.response === 'accept'
                  ? 'Aceptado'
                  : flow?.response === 'reject'
                    ? 'Rechazado'
                    : 'Esperando respuesta'}
            </Text>
            <Text style={styles.statusMeta}>
              {flow?.createdAt ? `Iniciado ${formatClock(flow.createdAt)}` : ''}
              {flow?.answeredAt ? `  ·  Respondido ${formatClock(flow.answeredAt)}` : ''}
            </Text>
            {actionType === 'call' && flow?.status === 'pending' ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => respond('reject')}
                  disabled={replying}
                >
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => respond('accept')}
                  disabled={replying}
                >
              <Text style={styles.acceptButtonText}>{replying ? '...' : 'Aceptar'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <FlatList
            style={styles.messagesList}
            inverted
            data={[...visibleMessages].reverse()}
            keyExtractor={(_, index) => `${index}`}
            renderItem={({ item }) => {
              const mine = item.sender === 'host';

              return (
                <View style={[styles.messageRow, mine ? styles.rowEnd : styles.rowStart]}>
                  <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
                    <Text style={mine ? styles.myText : styles.otherText}>{item.message}</Text>
                    <Text style={[styles.timeLabel, mine ? styles.myTime : styles.otherTime]}>
                      {formatClock(item.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.emptyChatTitle}>Todavía no hay mensajes</Text>
                <Text style={styles.emptyChatText}>Respondé cuando quieras. Todo queda guardado.</Text>
              </View>
            }
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder={expired ? 'La conversación terminó' : 'Escribí una respuesta...'}
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!expired}
            />
            <TouchableOpacity
              style={[styles.sendButton, (sending || expired) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={sending || expired}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FAFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FAFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {error ? <View style={styles.toast}><Text style={styles.toastText}>{error}</Text></View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FAFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F3F3F3',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  headerSubtitle: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
  },
  headerBadge: {
    minWidth: 46,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1522',
  },
  headerBadgeText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
  },
  statusCard: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statusTitle: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 16,
  },
  statusText: {
    marginTop: 6,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  statusMeta: {
    marginTop: 8,
    color: '#999',
    fontFamily: 'BaiJamjuree',
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#F3F3F3',
  },
  acceptButton: {
    backgroundColor: '#7D1522',
  },
  rejectButtonText: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  acceptButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
  },
  messagesList: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  emptyChatTitle: {
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  emptyChatText: {
    textAlign: 'center',
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
  },
  rowEnd: {
    justifyContent: 'flex-end',
  },
  rowStart: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#7D1522',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F1F1F1',
    borderBottomLeftRadius: 4,
  },
  myText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    lineHeight: 20,
  },
  otherText: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    lineHeight: 20,
  },
  timeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontFamily: 'BaiJamjuree',
  },
  myTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  otherTime: {
    color: '#777',
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
    backgroundColor: '#FAFAFA',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1522',
  },
  sendButtonDisabled: {
    opacity: 0.75,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#666',
    fontFamily: 'BaiJamjuree',
  },
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F4C4C4',
  },
  toastText: {
    color: '#B3261E',
    fontFamily: 'BaiJamjuree',
  },
});
