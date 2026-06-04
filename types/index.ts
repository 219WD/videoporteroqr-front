export type ConversationItem = {
  id: string;
  conversationId: string;
  callId?: string;
  guestName: string;
  status: string;
  response?: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  lastMessageSender: 'host' | 'guest' | null;
  lastMessageDeliveryStatus?: 'sent' | 'delivered' | 'read' | null;
  lastMessageDeliveredAt?: string | null;
  lastMessageReadAt?: string | null;
  messageCount: number;
  hostUnreadCount: number;
  isAnonymous: boolean;
  createdAt?: string | null;
  answeredAt?: string | null;
};

export type ChatMessage = {
  id: string;
  sender: 'host' | 'guest';
  message: string;
  timestamp: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
  deliveredAt?: string | null;
  readAt?: string | null;
};

export type CallPayload = {
  callId: string;
  conversationId: string;
  status?: string;
  reason?: string | null;
  expiresAt?: string | null;
  initiator?: { id?: string | null; role?: string | null; name?: string | null };
  target?: { id?: string | null; role?: string | null; name?: string | null };
  media?: { audio?: boolean; speaker?: boolean; video?: boolean };
};