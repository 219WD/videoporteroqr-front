import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import AppView from '../../components/AppView';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { SOCKET_URL } from '../../utils/backend';

type AnonymousConversationItem = {
  id: string;
  conversationId: string;
  callId?: string;
  guestName: string;
  status: string;
  response?: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  lastMessageSender: 'host' | 'guest' | null;
  messageCount: number;
  hostUnreadCount: number;
  isAnonymous: boolean;
  createdAt?: string | null;
  answeredAt?: string | null;
};

function upsertAnonymousConversation(
  list: AnonymousConversationItem[],
  payload: Partial<AnonymousConversationItem> & { callId: string },
) {
  const conversationId = payload.callId;
  const next = list.filter((item) => item.conversationId !== conversationId);
  const existing = list.find((item) => item.conversationId === conversationId);

  next.unshift({
    id: conversationId,
    conversationId,
    callId: conversationId,
    guestName: payload.guestName ?? existing?.guestName ?? 'Visitante',
    status: payload.status ?? existing?.status ?? 'pending',
    response: payload.response ?? existing?.response ?? null,
    lastMessageAt: payload.lastMessageAt ?? existing?.lastMessageAt ?? null,
    lastMessageText: payload.lastMessageText ?? existing?.lastMessageText ?? null,
    lastMessageSender: payload.lastMessageSender ?? existing?.lastMessageSender ?? null,
    messageCount: payload.messageCount ?? existing?.messageCount ?? 0,
    hostUnreadCount: payload.hostUnreadCount ?? existing?.hostUnreadCount ?? 0,
    isAnonymous: payload.isAnonymous ?? existing?.isAnonymous ?? true,
    createdAt: payload.createdAt ?? existing?.createdAt ?? null,
    answeredAt: payload.answeredAt ?? existing?.answeredAt ?? null,
  });

  return next;
}

export default function MessagesScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [anonymousConversations, setAnonymousConversations] = useState<AnonymousConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef<any>(null);

  const loadAnonymous = useCallback(async () => {
    const response = await api.get('/messages/anonymous-conversations');
    setAnonymousConversations(
      (response.data.conversations || []).map((item: AnonymousConversationItem) => ({
        ...item,
        conversationId: item.conversationId || item.callId || item.id,
        callId: item.callId || item.conversationId || item.id,
      })),
    );
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await loadAnonymous();
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAnonymous]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  useEffect(() => {
    let active = true;

    async function connectSocket() {
      if (!user?.id) return;

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

      socket.on('anonymous-conversation-updated', (payload: any) => {
        if (!payload?.callId) return;
        setAnonymousConversations((current) => upsertAnonymousConversation(current, payload));
      });

      socket.on('new-flow-message', (payload: any) => {
        if (!payload?.callId || !payload?.message) return;

        setAnonymousConversations((current) =>
          current
            .map((item) =>
              item.conversationId === payload.callId
                ? {
                  ...item,
                  lastMessageAt: payload.timestamp || item.lastMessageAt,
                  lastMessageText: payload.message,
                  lastMessageSender: payload.sender || item.lastMessageSender,
                  messageCount: item.messageCount + 1,
                  hostUnreadCount: payload.sender === 'guest' ? item.hostUnreadCount + 1 : item.hostUnreadCount,
                }
                : item,
            )
            .sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || ''))),
        );
      });

      socket.on('flow-response', (payload: any) => {
        if (!payload?.callId) return;

        setAnonymousConversations((current) =>
          current.map((item) =>
            item.conversationId === payload.callId
              ? {
                ...item,
                status: payload.response === 'accept' ? 'answered' : 'rejected',
                response: payload.response ?? item.response,
              }
              : item,
          ),
        );
      });
    }

    connectSocket();

    return () => {
      active = false;
      socketRef.current?.disconnect?.();
    };
  }, [user?.id, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openConversation = (conversationId: string) => {
    if (!conversationId) {
      console.warn('[messages] openConversation called without conversationId');
      return;
    }
    router.push(`/flows/${encodeURIComponent(conversationId)}`);
  };

  const renderAnonymousConversation = ({ item }: { item: AnonymousConversationItem }) => {
    const preview = item.lastMessageText || 'Sin mensajes todavía';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openConversation(item.conversationId || item.callId || item.id)}
      >
        <View style={styles.avatarAnon}>
          <Ionicons name="person" size={20} color="#7D1522" />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name}>{item.guestName}</Text>
            <Text style={styles.time}>{formatDate(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.email}>Chat anónimo</Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.lastMessageSender === 'host' ? `Tú: ${preview}` : preview}
          </Text>
          {item.hostUnreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.hostUnreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <Text style={styles.subtitle}>Historial anónimo por QR</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : anonymousConversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Todavía no hay mensajes</Text>
          <Text style={styles.emptyText}>Cuando entren visitantes por QR, sus chats aparecerán aquí.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/qr')}>
            <Text style={styles.primaryButtonText}>Ver QR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={anonymousConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderAnonymousConversation}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />}
        />
      )}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FAFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'BaiJamjuree-Bold',
    color: '#3D3D3D',
  },
  subtitle: {
    marginTop: 4,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  avatarAnon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F4F6',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  time: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'BaiJamjuree',
  },
  email: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  preview: {
    marginTop: 10,
    color: '#444',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7D1522',
  },
  badgeText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 11,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    color: '#666',
    fontFamily: 'BaiJamjuree',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#7D1522',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
  },
});
