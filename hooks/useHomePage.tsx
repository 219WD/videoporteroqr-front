import { AuthContext } from "@/context/AuthContext";
import { ConversationItem } from "@/types";
import { api } from '@/utils/api';
import { CHAT_EVENTS } from '@/utils/chatContract';
import { getSocket } from '@/utils/socket';
import { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useHomePage = () => {
  function mergeConversation(current: ConversationItem[], nextConversation: Partial<ConversationItem> & { conversationId?: string; callId?: string }) {
    const conversationId = nextConversation.conversationId || nextConversation.callId;
    if (!conversationId) {
      return current;
    }
  
    const nextItem: ConversationItem = {
      id: nextConversation.id || conversationId,
      conversationId,
      callId: nextConversation.callId || conversationId,
      guestName: nextConversation.guestName || 'Visitante',
      status: nextConversation.status || 'pending',
      response: nextConversation.response || null,
      lastMessageAt: nextConversation.lastMessageAt || new Date().toISOString(),
      lastMessageText: nextConversation.lastMessageText || 'Nuevo mensaje',
      lastMessageSender: nextConversation.lastMessageSender || 'guest',
      lastMessageDeliveryStatus: nextConversation.lastMessageDeliveryStatus || 'sent',
      lastMessageDeliveredAt: nextConversation.lastMessageDeliveredAt || null,
      lastMessageReadAt: nextConversation.lastMessageReadAt || null,
      messageCount: nextConversation.messageCount || 1,
      hostUnreadCount: nextConversation.hostUnreadCount ?? (nextConversation.lastMessageSender === 'guest' ? 1 : 0),
      isAnonymous: nextConversation.isAnonymous !== false,
      createdAt: nextConversation.createdAt || null,
      answeredAt: nextConversation.answeredAt || null,
    };
  
    const existingIndex = current.findIndex((item) => item.conversationId === conversationId);
    const next = [...current];
  
    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        ...nextItem,
        hostUnreadCount: nextItem.hostUnreadCount,
        lastMessageSender: nextItem.lastMessageSender,
        lastMessageText: nextItem.lastMessageText,
        lastMessageAt: nextItem.lastMessageAt,
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

  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

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

        const nextConversations = Array.isArray(data?.conversations) ? data.conversations : [];
        setConversations(nextConversations);
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

  const keyExtractor = (item: ConversationItem) => item.conversationId

  return {
    conversations,
    loading,
    insets,
    keyExtractor,
  }
}