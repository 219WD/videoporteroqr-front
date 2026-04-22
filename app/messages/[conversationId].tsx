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

type MessageItem = {
  id: string | null;
  senderId: string | null;
  senderName: string;
  text: string;
  createdAt: string | null;
};

type ConversationDetail = {
  id: string;
  conversationId: string;
  contact: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  lastMessageAt: string | null;
  lastMessageText?: string | null;
  lastMessageSenderName?: string | null;
  messageCount?: number;
  unreadCount?: number;
  pagination?: {
    hasMore: boolean;
    nextCursor: number | null;
  };
};

export default function ConversationScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const conversationId = useMemo(() => {
    const value = params.conversationId;
    return Array.isArray(value) ? value[0] : value;
  }, [params.conversationId]);

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const nextCursorRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  const mergeUniqueMessages = useCallback((existing: MessageItem[], incoming: MessageItem[]) => {
    const seen = new Set(existing.map((item) => item.id));
    const merged = [...existing];

    incoming.forEach((item) => {
      if (!item.id || seen.has(item.id)) return;
      merged.push(item);
      seen.add(item.id);
    });

    return merged;
  }, []);

  const normalizeMessages = useCallback((list: MessageItem[]) => {
    const map = new Map<string, MessageItem>();

    list.forEach((item, index) => {
      const key = item.id || `${item.senderId || 'unknown'}:${item.createdAt || index}:${item.text || ''}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }, []);

  const visibleMessages = useMemo(() => normalizeMessages(messages), [messages, normalizeMessages]);

  const loadConversation = useCallback(async (appendOlder = false) => {
    if (!conversationId) return;

    try {
      if (appendOlder) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const paramsQuery: Record<string, string> = { limit: '30' };
      const cursor = appendOlder ? nextCursorRef.current : null;
      if (appendOlder && cursor) {
        paramsQuery.before = String(cursor);
      }

      const response = await api.get(`/messages/conversations/${conversationId}`, {
        params: paramsQuery,
      });

      const payload = response.data.conversation || null;
      const pageMessages = payload?.messages || [];

      setConversation({
        ...payload,
        messages: undefined,
      });

      setHasMore(!!payload?.pagination?.hasMore);
      setNextCursor(payload?.pagination?.nextCursor || null);
      nextCursorRef.current = payload?.pagination?.nextCursor || null;

      if (appendOlder) {
        setMessages((current) => normalizeMessages(mergeUniqueMessages(current, pageMessages)));
      } else {
        setMessages(normalizeMessages(pageMessages));
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'No se pudo cargar el chat');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, mergeUniqueMessages]);

  useFocusEffect(
    useCallback(() => {
      loadConversation(false);
    }, [loadConversation]),
  );

  useEffect(() => {
    let active = true;

    async function connectSocket() {
      if (!user?.id || !conversationId) return;

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

      socket.on('conversation-message', (payload: any) => {
        if (payload?.conversationId !== conversationId || !payload?.message) return;

        setMessages((current) => {
          const exists = current.some((item) => item.id === payload.message.id);
          if (exists) return current;
          return normalizeMessages([payload.message, ...current]);
        });

        api.post(`/messages/conversations/${conversationId}/read`).catch(() => {});
      });

      socket.on('conversation-updated', (payload: any) => {
        if (payload?.conversationId !== conversationId) return;

        setConversation((current) =>
          current
            ? {
                ...current,
                lastMessageAt: payload.lastMessageAt || current.lastMessageAt,
                lastMessageText: payload.lastMessageText || current.lastMessageText,
                lastMessageSenderName: payload.lastMessageSenderName || current.lastMessageSenderName,
                messageCount: payload.messageCount || current.messageCount,
                unreadCount: payload.unreadCount ?? current.unreadCount,
              }
            : current,
        );
      });

      socket.on('conversation-read', (payload: any) => {
        if (payload?.conversationId !== conversationId) return;

        setConversation((current) =>
          current
            ? {
                ...current,
                unreadCount: 0,
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
  }, [conversationId, user?.id, user?.role]);

  const loadOlderMessages = () => {
    if (!hasMore || loading || loadingMore || !conversationId) return;
    loadConversation(true);
  };

  const goBackToMessages = () => {
    router.replace('/messages');
  };

  const startCall = async () => {
    const contactId = conversation?.contact?.id;
    if (!contactId) {
      Alert.alert('Llamada', 'No se pudo identificar el contacto de este chat');
      return;
    }

    try {
      const response = await api.post('/calls/sessions', {
        contactUserId: contactId,
      });

      const callId = response.data?.call?.callId;
      if (!callId) {
        throw new Error('No se pudo iniciar la llamada');
      }

      router.push({
        pathname: '/calls/[callId]',
        params: {
          callId,
          role: 'caller',
        },
      });
    } catch (error: any) {
      console.error('Error starting call from chat:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo iniciar la llamada');
    }
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || !conversationId) return;

    try {
      setSending(true);
      const response = await api.post(`/messages/conversations/${conversationId}/messages`, {
        text,
      });

      if (response.data?.message) {
        setMessages((current) => normalizeMessages(mergeUniqueMessages([response.data.message, ...current], [])));
      }

      if (response.data?.conversation) {
        setConversation({
          ...response.data.conversation,
          messages: undefined,
        });
        setHasMore(!!response.data.conversation?.pagination?.hasMore);
        setNextCursor(response.data.conversation?.pagination?.nextCursor || null);
        nextCursorRef.current = response.data.conversation?.pagination?.nextCursor || null;
      }
      setMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    api.post(`/messages/conversations/${conversationId}/read`).catch(() => {});
  }, [conversationId]);

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    const isMine = item.senderId === user?.id;
    const bubbleStyle = isMine ? styles.myBubble : styles.otherBubble;
    const textStyle = isMine ? styles.myText : styles.otherText;

    return (
      <View style={[styles.messageRow, isMine ? styles.rowEnd : styles.rowStart]}>
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={textStyle}>{item.text}</Text>
          <Text style={[styles.timeLabel, isMine ? styles.myTime : styles.otherTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToMessages}>
          <Ionicons name="chevron-back" size={26} color="#3D3D3D" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{conversation?.contact?.name || 'Conversación'}</Text>
          <Text style={styles.headerSubtitle}>{conversation?.contact?.email || ''}</Text>
        </View>
        <View style={styles.headerActions}>
          {conversation?.unreadCount ? (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{conversation.unreadCount}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.callHeaderButton}
            onPress={startCall}
            disabled={!conversation?.contact?.id}
          >
            <Ionicons name="call" size={18} color="#7D1522" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando conversación...</Text>
        </View>
      ) : (
        <>
          <FlatList
            style={styles.messagesList}
            inverted
            data={visibleMessages}
            keyExtractor={(item, index) => item.id || `${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.emptyChatTitle}>Todavía no hay mensajes</Text>
                <Text style={styles.emptyChatText}>
                  Escribe el primer mensaje para iniciar esta conversación.
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#7D1522" />
                  <Text style={styles.loadingMoreText}>Cargando mensajes anteriores...</Text>
                </View>
              ) : null
            }
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.25}
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={sending}
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
    gap: 10,
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
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1522',
  },
  headerBadgeText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
  },
  callHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
    borderWidth: 1,
    borderColor: '#E6D7DA',
  },
  list: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  messagesList: {
    flex: 1,
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
  loadingMore: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadingMoreText: {
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
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
});
