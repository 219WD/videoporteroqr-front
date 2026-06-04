import { formatClock } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useChatByCallIdPage } from '@/hooks/useChatByCallIdPage';

function formatTimeLeft(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ChatScreen() {
  const {
    props: {
      insets,
      conversation,
      conversationTimeoutAt,
      expired,
      timeLeftMs,
      loading,
      filteredMessages,
      message,
      setMessage,
      error,
      sending,
    },
    methods: { goBackFromChat, keyExtractor, sendMessage },
  } = useChatByCallIdPage();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBackFromChat}>
          <Ionicons name="chevron-back" size={26} color="#3D3D3D" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{conversation.guestName || 'Conversacion anonima'}</Text>
          <Text style={styles.headerSubtitle}>
            {!conversationTimeoutAt
              ? 'Sesión activa'
              : expired
                ? 'La conversacion termino'
                : `Restan ${formatTimeLeft(timeLeftMs)}`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Ionicons name="hourglass-outline" size={44} color="#d32f2f" />
          <Text style={styles.loadingText}>Cargando conversacion...</Text>
        </View>
      ) : (
        <>
          <FlatList
            style={styles.messagesList}
            inverted
            data={[...filteredMessages].reverse()}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => {
              const mine = item.sender === 'host';
              const deliveryMark =
                item.deliveryStatus === 'read'
                  ? '✓✓'
                  : item.deliveryStatus === 'delivered'
                    ? '✓'
                    : '';

              return (
                <View style={[styles.messageRow, mine ? styles.rowEnd : styles.rowStart]}>
                  <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
                    <Text style={mine ? styles.myText : styles.otherText}>{item.message}</Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.timeLabel, mine ? styles.myTime : styles.otherTime]}>
                        {formatClock(item.timestamp)}
                      </Text>
                      {mine && deliveryMark ? (
                        <Text
                          style={[
                            styles.deliveryMark,
                            item.deliveryStatus === 'read'
                              ? styles.deliveryMarkRead
                              : styles.deliveryMarkDelivered,
                          ]}
                        >
                          {deliveryMark}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 64 }]}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.emptyChatTitle}>Todavia no hay mensajes</Text>
                <Text style={styles.emptyChatText}>Escribi un mensaje para empezar.</Text>
              </View>
            }
          />

          <View style={[styles.composer, { paddingBottom: 8 }]}>
            <TextInput
              style={styles.input}
              placeholder={expired ? 'La conversacion termino' : 'Escribi un mensaje...'}
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
              <Ionicons name="send" size={18} color="#FAFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {error ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{error}</Text>
        </View>
      ) : null}
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
    backgroundColor: '#d32f2f',
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
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  myTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  otherTime: {
    color: '#777',
  },
  deliveryMark: {
    fontSize: 11,
    fontFamily: 'BaiJamjuree-Bold',
    letterSpacing: 0.3,
  },
  deliveryMarkDelivered: {
    color: 'rgba(255,255,255,0.8)',
  },
  deliveryMarkRead: {
    color: '#8ec5ff',
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
    backgroundColor: '#d32f2f',
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
