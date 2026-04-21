import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppView from '../../components/AppView';
import io from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { SOCKET_URL } from '../../utils/backend';

type ConversationItem = {
  id: string;
  conversationId: string;
  contact: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  lastMessageSenderName: string | null;
  messageCount: number;
  unreadCount: number;
};

function upsertConversation(list: ConversationItem[], payload: Partial<ConversationItem> & { conversationId: string }) {
  const next = list.filter((item) => item.conversationId !== payload.conversationId);
  const existing = list.find((item) => item.conversationId === payload.conversationId);
  const merged: ConversationItem = {
    id: payload.conversationId,
    conversationId: payload.conversationId,
    contact: payload.contact ?? existing?.contact ?? null,
    lastMessageAt: payload.lastMessageAt ?? existing?.lastMessageAt ?? null,
    lastMessageText: payload.lastMessageText ?? existing?.lastMessageText ?? null,
    lastMessageSenderName: payload.lastMessageSenderName ?? existing?.lastMessageSenderName ?? null,
    messageCount: payload.messageCount ?? existing?.messageCount ?? 0,
    unreadCount: payload.unreadCount ?? existing?.unreadCount ?? 0,
  };

  next.unshift(merged);
  return next;
}

export default function MessagesScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef<any>(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'No se pudieron cargar los chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    if (!user?.id) return;

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
    });

    socket.on('conversation-updated', (payload: any) => {
      if (!payload?.conversationId) return;

      setConversations((current) => {
        return upsertConversation(current, payload);
      });
    });

    socket.on('conversation-message', (payload: any) => {
      if (!payload?.conversationId || !payload?.message) return;

      setConversations((current) => {
        const index = current.findIndex((item) => item.conversationId === payload.conversationId);
        if (index === -1) return current;

        const updated = [...current];
        const target = updated[index];
        updated.splice(index, 1);
        updated.unshift({
          ...target,
          lastMessageAt: payload.message.createdAt || target.lastMessageAt,
          lastMessageText: payload.message.text,
          lastMessageSenderName: payload.message.senderName,
          messageCount: target.messageCount + 1,
          unreadCount: payload.unreadCount ?? target.unreadCount,
        });
        return updated;
      });
    });

    socket.on('conversation-read', (payload: any) => {
      if (!payload?.conversationId) return;

      setConversations((current) =>
        current.map((item) =>
          item.conversationId === payload.conversationId
            ? {
              ...item,
              unreadCount: 0,
            }
            : item,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
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
    router.push({
      pathname: '/messages/[conversationId]',
      params: { conversationId },
    });
  };

  const renderConversation = ({ item }: { item: ConversationItem }) => {
    const name = item.contact?.name || 'Contacto';
    const preview = item.lastMessageText || 'Sin mensajes todavía';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openConversation(item.conversationId)}>
        <View style={styles.avatar}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#7D1522" />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.time}>{formatDate(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.email}>{item.contact?.email || ''}</Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.lastMessageSenderName ? `${item.lastMessageSenderName}: ${preview}` : preview}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
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
        <Text style={styles.subtitle}>Chats activos con tus contactos</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando chats...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Todavía no hay chats</Text>
          <Text style={styles.emptyText}>
            Cuando envíes un mensaje desde Contactos, aparecerá aquí el historial.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/contacts')}>
            <Text style={styles.primaryButtonText}>Ver contactos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderConversation}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />
          }
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
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
