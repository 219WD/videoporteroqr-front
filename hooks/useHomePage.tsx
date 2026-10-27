import { AuthContext } from "@/context/AuthContext";
import { ConversationItem } from "@/types";
import { api } from '@/utils/api';
import { CHAT_EVENTS } from '@/utils/chatContract';
import { getSocket } from '@/utils/socket';
import { isConversationExpired } from '@/utils/formatters';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StatusFilter = 'all' | 'pending' | 'answered' | 'closed';
type PeriodFilter = 'all' | 'today' | 'week' | 'expired';

const normalizeConversation = (conversation: Partial<ConversationItem> & { conversationId?: string; callId?: string }) => {
  const conversationId = conversation.conversationId || conversation.callId || conversation.id;
  if (!conversationId) {
    return null;
  }

  return {
    id: conversation.id || conversationId,
    conversationId,
    callId: conversation.callId || conversationId,
    qrCode: conversation.qrCode || null,
    guestName: conversation.guestName || 'Visitante',
    status: conversation.status || 'pending',
    response: conversation.response || null,
    lastMessageAt: conversation.lastMessageAt || conversation.createdAt || null,
    lastMessageText: conversation.lastMessageText || null,
    lastMessageSender: conversation.lastMessageSender || null,
    lastMessageDeliveryStatus: conversation.lastMessageDeliveryStatus || null,
    lastMessageDeliveredAt: conversation.lastMessageDeliveredAt || null,
    lastMessageReadAt: conversation.lastMessageReadAt || null,
    messageCount: conversation.messageCount ?? 0,
    hostUnreadCount: Math.max(0, conversation.hostUnreadCount ?? (conversation.lastMessageSender === 'guest' ? 1 : 0)),
    isAnonymous: conversation.isAnonymous !== false,
    createdAt: conversation.createdAt || null,
    answeredAt: conversation.answeredAt || null,
  } satisfies ConversationItem;
};

function mergeConversation(current: ConversationItem[], nextConversation: Partial<ConversationItem> & { conversationId?: string; callId?: string }) {
  const nextItem = normalizeConversation(nextConversation);
  if (!nextItem) {
    return current;
  }

  const existingIndex = current.findIndex((item) => item.conversationId === nextItem.conversationId);
  const next = [...current];

  if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      ...nextItem,
      hostUnreadCount: nextConversation.hostUnreadCount ?? next[existingIndex].hostUnreadCount,
      lastMessageSender: nextConversation.lastMessageSender || next[existingIndex].lastMessageSender,
      lastMessageText: nextConversation.lastMessageText || next[existingIndex].lastMessageText,
      lastMessageAt: nextConversation.lastMessageAt || next[existingIndex].lastMessageAt,
    };
  } else {
    next.unshift(nextItem);
  }

  return next.sort((a, b) => {
    const left = new Date(b.lastMessageAt || 0).getTime();
    const right = new Date(a.lastMessageAt || 0).getTime();
    return left - right;
  });
}

export const useHomePage = () => {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  useEffect(() => {
    const socket = getSocket();

    const handleConversationUpdate = (payload: any) => {
      const conversation = payload?.conversation || payload;
      const message = payload?.message || null;
      if (!conversation) {
        return;
      }

      setConversations((current) =>
        mergeConversation(current, {
          id: conversation.id || conversation.conversationId,
          conversationId: conversation.conversationId || conversation.id,
          callId: conversation.callId || conversation.conversationId || conversation.id,
          qrCode: conversation.qrCode,
          guestName: conversation.guestName,
          status: conversation.status,
          response: conversation.response,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageText: conversation.lastMessageText || message?.text || message?.message,
          lastMessageSender: conversation.lastMessageSender || message?.sender,
          lastMessageDeliveryStatus: conversation.lastMessageDeliveryStatus || message?.deliveryStatus,
          lastMessageDeliveredAt: conversation.lastMessageDeliveredAt || message?.deliveredAt,
          lastMessageReadAt: conversation.lastMessageReadAt || message?.readAt,
          messageCount: conversation.messageCount,
          hostUnreadCount: conversation.hostUnreadCount,
          isAnonymous: conversation.isAnonymous,
          createdAt: conversation.createdAt,
          answeredAt: conversation.answeredAt,
        }),
      );
    };

    socket.on(CHAT_EVENTS.CONVERSATION_UPDATED, handleConversationUpdate);
    socket.on(CHAT_EVENTS.MESSAGE_NEW, handleConversationUpdate);
    socket.on(CHAT_EVENTS.MESSAGE_STATUS, handleConversationUpdate);

    return () => {
      socket.off(CHAT_EVENTS.CONVERSATION_UPDATED, handleConversationUpdate);
      socket.off(CHAT_EVENTS.MESSAGE_NEW, handleConversationUpdate);
      socket.off(CHAT_EVENTS.MESSAGE_STATUS, handleConversationUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      if (!user?.id || authLoading) {
        return;
      }

      setLoading(true);

      try {
        const { data } = await api.get('/server/conversations');
        if (!active) {
          return;
        }

        const nextConversations = Array.isArray(data?.conversations)
          ? data.conversations.map(normalizeConversation).filter(Boolean) as ConversationItem[]
          : [];
        setConversations(nextConversations.sort((a, b) =>
          new Date(b.lastMessageAt || b.createdAt || 0).getTime() -
          new Date(a.lastMessageAt || a.createdAt || 0).getTime(),
        ));
      } catch {
        if (!active) {
          return;
        }

        setConversations([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadConversations();

    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  const unreadCount = useMemo(
    () => conversations.reduce((total, item) => total + Math.max(0, item.hostUnreadCount || 0), 0),
    [conversations],
  );

  const visibleConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return conversations.filter((item) => {
      const status = String(item.status || 'pending').toLocaleLowerCase();
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'pending' && status === 'pending')
        || (statusFilter === 'answered' && status === 'answered')
        || (statusFilter === 'closed' && ['timeout', 'rejected', 'closed', 'expired'].includes(status));
      const timestamp = new Date(item.lastMessageAt || item.createdAt || 0).getTime();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const matchesPeriod = periodFilter === 'all'
        || (periodFilter === 'today' && timestamp >= startOfToday)
        || (periodFilter === 'week' && timestamp >= Date.now() - 7 * 24 * 60 * 60 * 1000)
        || (periodFilter === 'expired' && isConversationExpired(item));
      const haystack = [item.guestName, item.lastMessageText, item.conversationId]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();

      return matchesStatus && matchesPeriod && (!normalizedSearch || haystack.includes(normalizedSearch));
    });
  }, [conversations, search, statusFilter, periodFilter]);

  const keyExtractor = (item: ConversationItem) => item.conversationId

  return {
    conversations: visibleConversations,
    totalConversations: conversations.length,
    unreadCount,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
    loading,
    insets,
    keyExtractor,
  }
}
