import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

const { width } = Dimensions.get('window');

// Definir tipos
interface FlowMessage {
  _id: string;
  message: string;
  sender: 'host' | 'guest';
  timestamp: string;
}

interface FlowDetail {
  _id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCompany?: string;
  isAnonymous: boolean;
  guestDataProvided: boolean;
  status: 'pending' | 'answered' | 'timeout' | 'rejected';
  response?: 'accept' | 'reject' | 'timeout';
  actionType: 'call' | 'message';
  callType: 'video' | 'message' | 'doorbell';
  messageContent?: string;
  createdAt: string;
  answeredAt?: string;
  messages: FlowMessage[];
}

interface FlowSummary {
  _id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCompany?: string;
  isAnonymous: boolean;
  status: string;
  actionType: string;
  callType: string;
  messagePreview?: string;
  createdAt: string;
  unreadMessages: number;
  lastMessageTime: string;
}

export default function MessagesScreen() {
  const { user } = useContext(AuthContext);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDetail | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    withMessages: 0,
    anonymous: 0,
    withContact: 0
  });

  // Cargar flujos
  const loadFlows = async () => {
    try {
      setLoading(true);
      const response = await api.get('/flows/history/' + user?.id);
      
      if (response.data.success) {
        const flowsData = response.data.flows || [];
        
        // Transformar datos para mostrar
        const transformedFlows = flowsData.map((flow: any) => {
          // Contar mensajes no leídos (simulación - podrías agregar campo read en el futuro)
          const unreadMessages = flow.messages?.filter((msg: any) => 
            msg.sender === 'guest' && !msg.read
          ).length || 0;
          
          // Obtener último mensaje
          const lastMessage = flow.messages?.length > 0 
            ? flow.messages[flow.messages.length - 1]
            : null;
          
          return {
            _id: flow._id,
            guestName: flow.guestName,
            guestEmail: flow.guestEmail,
            guestPhone: flow.guestPhone,
            guestCompany: flow.guestCompany,
            isAnonymous: flow.isAnonymous,
            status: flow.status,
            actionType: flow.actionType,
            callType: flow.callType,
            messagePreview: flow.messageContent 
              ? flow.messageContent.substring(0, 50) + (flow.messageContent.length > 50 ? '...' : '')
              : flow.messages?.[0]?.message?.substring(0, 50) || 'Sin mensaje',
            createdAt: flow.createdAt,
            unreadMessages,
            lastMessageTime: lastMessage?.timestamp || flow.createdAt
          };
        });
        
        setFlows(transformedFlows);
        
        // Calcular estadísticas
        const total = flowsData.length;
        const withMessages = flowsData.filter((f: any) => 
          f.messages && f.messages.length > 0
        ).length;
        const anonymous = flowsData.filter((f: any) => 
          f.isAnonymous
        ).length;
        const withContact = flowsData.filter((f: any) => 
          !f.isAnonymous && f.guestDataProvided
        ).length;
        
        setStats({ total, withMessages, anonymous, withContact });
      }
    } catch (error) {
      console.error('Error cargando flujos:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar detalles de un flujo
  const loadFlowDetails = async (flowId: string) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/flows/status/${flowId}`);
      
      if (response.data.success) {
        setSelectedFlow(response.data.call);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error cargando detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles');
    } finally {
      setDetailLoading(false);
    }
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFlow) return;
    
    try {
      setSendingMessage(true);
      
      const response = await api.post(`/flows/${selectedFlow._id}/send-message`, {
        message: newMessage.trim(),
        sender: 'host'
      });
      
      if (response.data.success) {
        // Actualizar mensajes en el flujo seleccionado
        const updatedFlow = { ...selectedFlow };
        updatedFlow.messages = [
          ...updatedFlow.messages,
          {
            _id: Date.now().toString(),
            message: newMessage.trim(),
            sender: 'host' as const,
            timestamp: new Date().toISOString()
          }
        ];
        setSelectedFlow(updatedFlow);
        setNewMessage('');
        
        // Actualizar la lista de flujos
        const updatedFlows = flows.map(flow => {
          if (flow._id === selectedFlow._id) {
            return {
              ...flow,
              messagePreview: newMessage.trim().substring(0, 50) + 
                (newMessage.length > 50 ? '...' : ''),
              lastMessageTime: new Date().toISOString()
            };
          }
          return flow;
        });
        setFlows(updatedFlows);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  // Refrescar datos
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFlows();
  }, []);

  // Recargar cuando se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      loadFlows();
    }, [])
  );

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `Hace ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Renderizar item de flujo
  const renderFlowItem = ({ item }: { item: FlowSummary }) => {
    const hasUnread = item.unreadMessages > 0;
    const hasContactInfo = !item.isAnonymous && (item.guestPhone || item.guestCompany);
    
    return (
      <TouchableOpacity
        style={[
          styles.flowItem,
          hasUnread && styles.unreadFlowItem
        ]}
        onPress={() => loadFlowDetails(item._id)}
      >
        <View style={styles.flowHeader}>
          <View style={styles.flowTitleContainer}>
            <Text style={styles.guestName}>{item.guestName}</Text>
            {item.isAnonymous ? (
              <View style={styles.anonymousBadge}>
                <Text style={styles.anonymousText}>Anónimo</Text>
              </View>
            ) : (
              <View style={styles.contactBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#28a745" />
                <Text style={styles.contactText}>Con datos</Text>
              </View>
            )}
          </View>
          <Text style={styles.flowTime}>{formatDate(item.lastMessageTime)}</Text>
        </View>
        
        <Text style={styles.guestEmail} numberOfLines={1}>
          {item.guestEmail}
        </Text>
        
        {hasContactInfo && (
          <View style={styles.contactInfo}>
            {item.guestPhone && (
              <View style={styles.contactRow}>
                <Ionicons name="call" size={12} color="#666" />
                <Text style={styles.contactDetail}>{item.guestPhone}</Text>
              </View>
            )}
            {item.guestCompany && (
              <View style={styles.contactRow}>
                <Ionicons name="business" size={12} color="#666" />
                <Text style={styles.contactDetail}>{item.guestCompany}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.messagePreviewContainer}>
          <Ionicons 
            name={item.actionType === 'call' ? 'videocam' : 'chatbubble'} 
            size={16} 
            color={item.actionType === 'call' ? '#28a745' : '#007AFF'} 
            style={styles.messageIcon}
          />
          <Text style={styles.messagePreview} numberOfLines={2}>
            {item.messagePreview}
          </Text>
        </View>
        
        <View style={styles.flowFooter}>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              item.status === 'answered' && styles.statusAnswered,
              item.status === 'pending' && styles.statusPending,
              item.status === 'timeout' && styles.statusTimeout,
              item.status === 'rejected' && styles.statusRejected
            ]}>
              <Text style={styles.statusText}>
                {item.status === 'answered' ? 'Respondido' :
                 item.status === 'pending' ? 'Pendiente' :
                 item.status === 'timeout' ? 'Expirado' : 'Rechazado'}
              </Text>
            </View>
          </View>
          
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadMessages}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar mensaje en el modal
  const renderMessage = ({ item }: { item: FlowMessage }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'host' ? styles.hostMessage : styles.guestMessage
    ]}>
      <View style={styles.messageHeader}>
        <Text style={[
          styles.messageSender,
          item.sender === 'host' ? styles.hostSender : styles.guestSender
        ]}>
          {item.sender === 'host' ? 'Tú' : selectedFlow?.guestName || 'Visitante'}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>
    </View>
  );

  // Componente de estadísticas
  const StatsCard = ({ title, value, color }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7D1522" />
        <Text style={styles.loadingText}>Cargando mensajes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Mensajes y Flujos</Text>
      </View>

      {/* Estadísticas */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
      >
        <StatsCard title="Total flujos" value={stats.total} color="#7D1522" />
        <StatsCard title="Con mensajes" value={stats.withMessages} color="#28a745" />
        <StatsCard title="Con contacto" value={stats.withContact} color="#007AFF" />
        <StatsCard title="Anónimos" value={stats.anonymous} color="#6c757d" />
      </ScrollView>

      {/* Lista de flujos */}
      <FlatList
        data={flows}
        keyExtractor={(item) => item._id}
        renderItem={renderFlowItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7D1522']}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No hay mensajes aún</Text>
            <Text style={styles.emptyText}>
              Los visitantes aparecerán aquí cuando envíen mensajes o realicen videollamadas
            </Text>
          </View>
        }
      />

      {/* Modal de detalles */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header del modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#3D3D3D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Conversación</Text>
            <View style={{ width: 40 }} />
          </View>

          {detailLoading ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator size="large" color="#7D1522" />
              <Text style={styles.detailLoadingText}>Cargando...</Text>
            </View>
          ) : selectedFlow ? (
            <>
              {/* Información del visitante */}
              <View style={styles.guestInfoCard}>
                <View style={styles.guestInfoHeader}>
                  <Ionicons 
                    name="person-circle" 
                    size={40} 
                    color={selectedFlow.isAnonymous ? "#6c757d" : "#7D1522"} 
                  />
                  <View style={styles.guestInfo}>
                    <Text style={styles.guestInfoName}>{selectedFlow.guestName}</Text>
                    <Text style={styles.guestInfoEmail}>{selectedFlow.guestEmail}</Text>
                    {selectedFlow.guestPhone && (
                      <Text style={styles.guestInfoPhone}>{selectedFlow.guestPhone}</Text>
                    )}
                    {selectedFlow.guestCompany && (
                      <Text style={styles.guestInfoCompany}>{selectedFlow.guestCompany}</Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.flowMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      {formatDate(selectedFlow.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons 
                      name={selectedFlow.actionType === 'call' ? 'videocam' : 'chatbubble'} 
                      size={14} 
                      color="#666" 
                    />
                    <Text style={styles.metaText}>
                      {selectedFlow.actionType === 'call' ? 'Videollamada' : 'Mensaje'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lista de mensajes */}
              <FlatList
                data={selectedFlow.messages}
                keyExtractor={(item) => item._id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                inverted={false}
                style={styles.messagesContainer}
              />

              {/* Input para enviar mensaje */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Escribe un mensaje..."
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FAFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
  },
  statsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 120,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'BaiJamjuree',
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  flowItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadFlowItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#7D1522',
    backgroundColor: '#FFF5F5',
  },
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  flowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  guestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    marginRight: 8,
  },
  anonymousBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  anonymousText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'BaiJamjuree',
  },
  contactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4EDDA',
  },
  contactText: {
    fontSize: 10,
    color: '#28a745',
    marginLeft: 4,
    fontFamily: 'BaiJamjuree',
  },
  flowTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'BaiJamjuree',
  },
  guestEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'BaiJamjuree',
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'BaiJamjuree',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageIcon: {
    marginRight: 8,
  },
  messagePreview: {
    flex: 1,
    fontSize: 14,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  flowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  statusAnswered: {
    backgroundColor: '#D4EDDA',
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusTimeout: {
    backgroundColor: '#F8D7DA',
  },
  statusRejected: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'BaiJamjuree',
  },
  unreadBadge: {
    backgroundColor: '#7D1522',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'BaiJamjuree',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#3D3D3D',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'BaiJamjuree-Bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: 'white',
  },
  modalBackButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  detailLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
  },
  guestInfoCard: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  guestInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guestInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D3D3D',
    marginBottom: 2,
    fontFamily: 'BaiJamjuree-Bold',
  },
  guestInfoEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'BaiJamjuree',
  },
  guestInfoPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'BaiJamjuree',
  },
  guestInfoCompany: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    fontFamily: 'BaiJamjuree',
  },
  flowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'BaiJamjuree',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesList: {
    paddingVertical: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  hostMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#7D1522',
    borderBottomRightRadius: 4,
  },
  guestMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'BaiJamjuree-Bold',
  },
  hostSender: {
    color: '#FFF',
  },
  guestSender: {
    color: '#3D3D3D',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'BaiJamjuree',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'BaiJamjuree',
  },
  hostMessageText: {
    color: '#FFF',
  },
  guestMessageText: {
    color: '#3D3D3D',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: 'white',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    fontFamily: 'BaiJamjuree',
  },
  sendButton: {
    backgroundColor: '#7D1522',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});