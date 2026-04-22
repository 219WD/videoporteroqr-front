import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

type AnonymousConversationItem = {
  id: string;
  callId: string;
  guestName: string;
  actionType: 'message' | 'call';
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

type TabKey = 'contacts' | 'anonymous';

function upsertConversation(
  list: ConversationItem[],
  payload: Partial<ConversationItem> & { conversationId: string },
) {
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

function upsertAnonymousConversation(
  list: AnonymousConversationItem[],
  payload: Partial<AnonymousConversationItem> & { callId: string },
) {
  const next = list.filter((item) => item.callId !== payload.callId);
  const existing = list.find((item) => item.callId === payload.callId);
  const merged: AnonymousConversationItem = {
    id: payload.callId,
    callId: payload.callId,
    guestName: payload.guestName ?? existing?.guestName ?? 'Visitante',
    actionType: payload.actionType ?? existing?.actionType ?? 'message',
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
  };

  next.unshift(merged);
  return next;
}

export default function MessagesScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<TabKey>('contacts');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [anonymousConversations, setAnonymousConversations] = useState<AnonymousConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef<any>(null);

  const loadContacts = useCallback(async () => {
    const response = await api.get('/messages/conversations');
    setConversations(response.data.conversations || []);
  }, []);

  const loadAnonymous = useCallback(async () => {
    try {
      const response = await api.get('/messages/anonymous-conversations');
      setAnonymousConversations(response.data.conversations || []);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAnonymousConversations([]);
        return;
      }

      throw error;
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await loadContacts();
      await loadAnonymous();
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'No se pudieron cargar los chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAnonymous, loadContacts]);

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

      socket.on('conversation-updated', (payload: any) => {
        if (!payload?.conversationId) return;

        setConversations((current) => upsertConversation(current, payload));
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

      socket.on('anonymous-conversation-updated', (payload: any) => {
        if (!payload?.callId) return;

        setAnonymousConversations((current) => upsertAnonymousConversation(current, payload));
      });

      socket.on('new-flow-message', (payload: any) => {
        if (!payload?.callId || !payload?.message) return;

        setAnonymousConversations((current) =>
          current
            .map((item) =>
              item.callId === payload.callId
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
            item.callId === payload.callId
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
    router.push({
      pathname: '/messages/[conversationId]',
      params: { conversationId },
    });
  };

  const openAnonymousConversation = (callId: string) => {
    router.push({
      pathname: '/flows/[callId]',
      params: { callId },
    });
  };

  const renderConversation = ({ item }: { item: ConversationItem }) => {
    const name = item.contact?.name || 'Contacto';
    const preview = item.lastMessageText || 'Sin mensajes todavia';

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

  const renderAnonymousConversation = ({ item }: { item: AnonymousConversationItem }) => {
    const preview = item.lastMessageText || (item.actionType === 'call' ? 'Llamada anónima' : 'Sin mensajes todavia');

    return (
      <TouchableOpacity style={styles.card} onPress={() => openAnonymousConversation(item.callId)}>
        <View style={styles.avatarAnon}>
          <Ionicons name={item.actionType === 'call' ? 'videocam' : 'person'} size={20} color="#7D1522" />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name}>{item.guestName}</Text>
            <Text style={styles.time}>{formatDate(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.email}>
            {item.actionType === 'call' ? 'Llamada anónima' : 'Chat anónimo'}
          </Text>
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

  const activeEmpty = selectedTab === 'contacts'
    ? {
        icon: 'chatbubbles-outline',
        title: 'Todavia no hay chats',
        text: 'Cuando envíes un mensaje desde Contactos, aparecerá aquí el historial.',
        action: () => router.push('/contacts'),
        actionLabel: 'Ver contactos',
      }
    : {
        icon: 'person-outline',
        title: 'Todavia no hay anonimos',
        text: 'Cuando entren visitantes por QR, sus chats aparecerán aquí.',
        action: () => router.push('/qr'),
        actionLabel: 'Ver QR',
      };

  return (
    <AppView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <Text style={styles.subtitle}>
          {selectedTab === 'contacts'
            ? 'Chats activos con tus contactos'
            : 'Historial anónimo por QR'}
        </Text>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'contacts' && styles.tabActive]}
            onPress={() => setSelectedTab('contacts')}
          >
            <Text style={[styles.tabText, selectedTab === 'contacts' && styles.tabTextActive]}>
              Contactos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'anonymous' && styles.tabActive]}
            onPress={() => setSelectedTab('anonymous')}
          >
            <Text style={[styles.tabText, selectedTab === 'anonymous' && styles.tabTextActive]}>
              Anonimos
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando chats...</Text>
        </View>
      ) : selectedTab === 'contacts' && conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name={activeEmpty.icon as any} size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>{activeEmpty.title}</Text>
          <Text style={styles.emptyText}>{activeEmpty.text}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={activeEmpty.action}>
            <Text style={styles.primaryButtonText}>{activeEmpty.actionLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : selectedTab === 'anonymous' && anonymousConversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name={activeEmpty.icon as any} size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>{activeEmpty.title}</Text>
          <Text style={styles.emptyText}>{activeEmpty.text}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={activeEmpty.action}>
            <Text style={styles.primaryButtonText}>{activeEmpty.actionLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : selectedTab === 'contacts' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderConversation}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />
          }
        />
      ) : (
        <FlatList
          data={anonymousConversations}
          keyExtractor={(item) => item.callId}
          renderItem={renderAnonymousConversation}
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
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  tabActive: {
    backgroundColor: '#7D1522',
    borderColor: '#7D1522',
  },
  tabText: {
    color: '#666',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FAFFFF',
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
