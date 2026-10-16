import { AuthContext } from '@/context/AuthContext';
import { ChatMessage } from '@/types';
import { CHAT_EVENTS } from '@/utils/chatContract';
import { createLogger } from '@/utils/logger';
import { getSocket } from '@/utils/socket';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const log = createLogger('useChatByCallIdPage');

export const useChatByCallIdPage = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ callId?: string }>();
  const { user } = useContext(AuthContext);
  const socket = getSocket();
  const conversationId = typeof params.callId === 'string' ? params.callId : '';
  const [guestName, setGuestName] = useState('Visitante anónimo');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const conversation = useMemo(() => ({
    conversationId,
    guestName,
  }), [conversationId, guestName]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hostId = user?.id || '';
  const hostName = user?.name || 'Propietario';
  const [conversationTimeoutAt, setConversationTimeoutAt] = useState<string | null>(null);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const deliveredMessageIdsRef = React.useRef(new Set<string>());
  const readMessageIdsRef = React.useRef(new Set<string>());
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageListRef = useRef<any>(null);

  function toChatMessage(message: any): ChatMessage | null {
    if (!message) {
      return null;
    }

    return {
      id: message.id || `${message.sender}:${message.createdAt || Date.now()}`,
      sender: message.sender === 'host' ? 'host' : 'guest',
      message: message.text || message.message || '',
      timestamp: message.createdAt || new Date().toISOString(),
      deliveryStatus: message.deliveryStatus || 'sent',
      deliveredAt: message.deliveredAt || null,
      readAt: message.readAt || null,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeLeftMs = useMemo(() => {
    if (!conversationTimeoutAt) {
      return 0;
    }

    const timeoutAtMs = new Date(conversationTimeoutAt).getTime();
    if (Number.isNaN(timeoutAtMs)) {
      return 0;
    }

    return Math.max(0, timeoutAtMs - now);
  }, [conversationTimeoutAt, now]);

  const expired = Boolean(conversationTimeoutAt) && timeLeftMs <= 0;

  const syncTimeoutAt = (payload: any) => {
    const nextGuestName = payload?.conversation?.guestName || payload?.guestName;
    if (typeof nextGuestName === 'string' && nextGuestName.trim()) {
      setGuestName(nextGuestName.trim());
    }
    const nextQrCode = payload?.conversation?.qrCode || payload?.qrCode;
    if (typeof nextQrCode === 'string' && nextQrCode.trim()) setQrCode(nextQrCode.trim());

    const timeoutAt =
      payload?.conversation?.expireAt ||
      payload?.conversation?.timeoutAt ||
      payload?.conversationTimeoutAt ||
      payload?.expireAt ||
      payload?.timeoutAt ||
      null;

    if (timeoutAt) {
      setConversationTimeoutAt(timeoutAt);
    }
  };

  const myRole = 'host';
  const isMessageAcked = (message: ChatMessage, status: 'delivered' | 'read') => {
    if (status === 'read') {
      return message.deliveryStatus === 'read' || Boolean(message.readAt);
    }

    return (
      message.deliveryStatus === 'delivered' ||
      message.deliveryStatus === 'read' ||
      Boolean(message.deliveredAt)
    );
  };

  const emitMessageStatus = (messageId: string, status: 'delivered' | 'read') => {
    const currentSocket = socket.connected ? socket : socket.connect();
    currentSocket.emit(
      status === 'read' ? CHAT_EVENTS.MESSAGE_READ : CHAT_EVENTS.MESSAGE_DELIVERED,
      {
        conversationId,
        messageId,
        role: myRole,
        sender: myRole,
        targetRole: myRole === 'host' ? 'guest' : 'host',
      },
    );
  };

  const acknowledgeVisibleMessages = (items: ChatMessage[]) => {
    items.forEach((item) => {
      if (item.sender === myRole) {
        return;
      }

      if (!deliveredMessageIdsRef.current.has(item.id) && !isMessageAcked(item, 'delivered')) {
        deliveredMessageIdsRef.current.add(item.id);
        emitMessageStatus(item.id, 'delivered');
      }

      if (!readMessageIdsRef.current.has(item.id) && !isMessageAcked(item, 'read')) {
        readMessageIdsRef.current.add(item.id);
        emitMessageStatus(item.id, 'read');
      }
    });
  };

  useEffect(() => {
    if (messages.length > 0) {
      acknowledgeVisibleMessages(messages);
    }
  }, [messages]);

  const goBackFromChat = () => {
    if (message.trim()) {
      setExitConfirmVisible(true);
      return;
    }
    router.navigate('/(tabs)');
  };

  const cancelExit = () => setExitConfirmVisible(false);
  const confirmExit = () => {
    setExitConfirmVisible(false);
    router.navigate('/(tabs)');
  };

  const emitTyping = (isTyping: boolean) => {
    socket.emit(CHAT_EVENTS.TYPING, { conversationId, role: 'host', isTyping });
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    emitTyping(Boolean(value.trim()));
    if (value.trim()) {
      typingStopTimerRef.current = setTimeout(() => emitTyping(false), 800);
    }
  };

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setError('No pudimos identificar esta conversación.');
      return;
    }

    socket.connect();

    const handleConversationState = (payload: any) => {
      const incomingConversationId =
        payload?.conversationId || payload?.conversation?.conversationId;
      if (incomingConversationId !== conversationId) {
        return;
      }

      setLoading(false);

      if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
        const nextMessages = payload.messages.map(toChatMessage).filter(Boolean) as ChatMessage[];

        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          acknowledgeVisibleMessages(nextMessages);
        }
      }

      syncTimeoutAt(payload);
    };

    const handleMessageNew = (payload: any) => {
      const incomingConversationId =
        payload?.conversation?.conversationId ||
        payload?.conversationId ||
        payload?.message?.conversationId;

      if (incomingConversationId !== conversationId) {
        return;
      }

      const nextMessage = toChatMessage(payload?.message);
      if (!nextMessage) {
        return;
      }

      syncTimeoutAt(payload);

      setMessages((current) => {
        if (current.some((item) => item.id === nextMessage.id)) {
          const merged = current.map((item) =>
            item.id === nextMessage.id ? { ...item, ...nextMessage } : item,
          );
          acknowledgeVisibleMessages(merged);
          return merged;
        }

        const nextMessages = [...current, nextMessage];
        acknowledgeVisibleMessages(nextMessages);
        return nextMessages;
      });
    };

    const handleMessageStatus = (payload: any) => {
      const incomingConversationId =
        payload?.conversationId ||
        payload?.conversation?.conversationId ||
        payload?.message?.conversationId;

      if (incomingConversationId !== conversationId) {
        return;
      }

      const updatedMessage = toChatMessage(payload?.message);
      if (!updatedMessage) {
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === updatedMessage.id ? { ...item, ...updatedMessage } : item,
        ),
      );
    };

    const handleTyping = (payload: any) => {
      if (payload?.conversationId !== conversationId || payload?.role !== 'guest') {
        return;
      }
      setVisitorTyping(payload.isTyping === true);
    };

    socket.on(CHAT_EVENTS.CONVERSATION_STATE, handleConversationState);
    socket.on(CHAT_EVENTS.MESSAGE_NEW, handleMessageNew);
    socket.on(CHAT_EVENTS.MESSAGE_STATUS, handleMessageStatus);
    socket.on(CHAT_EVENTS.TYPING, handleTyping);

    socket.emit(
      CHAT_EVENTS.JOIN,
      {
        conversationId,
        role: 'host',
        hostId,
        userId: hostId,
        hostName,
        guestName: conversation.guestName,
      },
      (response: any) => {
        if (response?.ok && Array.isArray(response.messages) && response.messages.length > 0) {
          const nextMessages = response.messages
            .map(toChatMessage)
            .filter(Boolean) as ChatMessage[];
          if (nextMessages.length > 0) {
            setMessages(nextMessages);
          }
        }

        syncTimeoutAt(response);
        setLoading(false);
      },
    );

    return () => {
      socket.off(CHAT_EVENTS.CONVERSATION_STATE, handleConversationState);
      socket.off(CHAT_EVENTS.MESSAGE_NEW, handleMessageNew);
      socket.off(CHAT_EVENTS.MESSAGE_STATUS, handleMessageStatus);
      socket.off(CHAT_EVENTS.TYPING, handleTyping);
      emitTyping(false);
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, [conversation.guestName, conversationId, hostId, hostName, socket]);

  const filteredMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    messageListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  }, [filteredMessages.length]);

  const sendMessage = () => {
    const text = message.trim();

    if (!text || expired) {
      return;
    }

    setSending(true);
    setError(null);

    socket.emit(
      CHAT_EVENTS.MESSAGE_SEND,
      {
        conversationId,
        hostId,
        guestName: conversation.guestName,
        sender: 'host',
        senderName: hostName,
        text,
      },
      (response: any) => {
        setSending(false);

        if (!response?.ok) {
          setError(response?.error || 'No pudimos enviar el mensaje');
          return;
        }

        const nextMessage = toChatMessage(response.message);
        if (nextMessage) {
          setMessages((current) => {
            if (current.some((item) => item.id === nextMessage.id)) {
              return current;
            }

            return [...current, nextMessage];
          });
        }

        setMessage('');
        emitTyping(false);
      },
    );
  };

  const keyExtractor = (item: ChatMessage, index: number) =>
    item.id || `${item.sender}:${item.timestamp}:${index}`;

  return {
    props: {
      insets,
      messageListRef,
      conversation,
        qrCode,
      conversationTimeoutAt,
      expired,
      timeLeftMs,
      loading,
      filteredMessages,
      message,
      visitorTyping,
      setMessage,
      error,
      sending,
        exitConfirmVisible,
    },
    methods: {
      goBackFromChat,
      cancelExit,
      confirmExit,
      keyExtractor,
      sendMessage,
      handleMessageChange,
    },
  };
};
