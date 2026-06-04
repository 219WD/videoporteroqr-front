import { ConversationItem } from "@/types";
import { formatClock, isConversationExpired } from "@/utils/formatters";
import { createLogger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

export const ConversationCard = ({ item }: { item: ConversationItem }) => {
  const log = createLogger('ConversationCard');
  const preview = item.lastMessageText || 'Sin mensajes todavia';
  const statusLabel =
    item.status === 'answered'
      ? 'Respondida'
      : item.status === 'timeout'
        ? 'Expirada'
        : item.status === 'rejected'
          ? 'Rechazada'
          : 'Pendiente';
  const deliveryMark =
    item.lastMessageSender === 'host'
      ? item.lastMessageDeliveryStatus === 'read'
        ? '✓✓'
        : item.lastMessageDeliveryStatus === 'delivered'
          ? '✓'
          : ''
      : '';
  const openConversation = (conversationId: string) => {
    if (!conversationId) {
      log.warn('openConversation called without conversationId');
      return;
    }
    router.push(`/chat/${encodeURIComponent(conversationId)}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openConversation(item.conversationId || item.callId || item.id)}
    >
      <View style={styles.avatarAnon}>
        <Ionicons name="person" size={20} color="#d32f2f" />
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.guestName}</Text>
          <View style={styles.timeWrap}>
            <Text style={styles.time}>{formatClock(item.lastMessageAt)}</Text>
            {deliveryMark ? <Text style={styles.deliveryMark}>{deliveryMark}</Text> : null}
          </View>
        </View>
        <Text style={styles.email}>{statusLabel}</Text>
        <Text style={styles.preview} numberOfLines={2}>
          {item.lastMessageSender === 'host' ? `Tu: ${preview}` : preview}
        </Text>
        {item.hostUnreadCount > 0 && !isConversationExpired(item) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.hostUnreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  list: {
    gap: 12,
  },
  headerStack: {
    marginBottom: 4,
  },
  hero: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#d32f2f',
    overflow: 'hidden',
    minHeight: 128,
  },
  heroCopy: {
    paddingRight: 90,
  },
  heroBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(250,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(250,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 46,
    height: 46,
  },
  kicker: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 26,
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
  timeWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  deliveryMark: {
    fontSize: 10,
    fontFamily: 'BaiJamjuree-Bold',
    color: '#7E57C2',
    letterSpacing: 0.4,
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
    backgroundColor: '#d32f2f',
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
  centerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
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
});
