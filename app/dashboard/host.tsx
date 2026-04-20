// app/dashboard/host.tsx - VERSIÓN MEJORADA CON MENSAJES
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DoorbellNotificationHandler from "../../components/DoorbellNotificationHandler";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../utils/api";

interface Guest {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

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

type TabType = 'info' | 'guests' | 'history' | 'messages';

export default function HostDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [hostData, setHostData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado para el modal de mensajes
  const [selectedFlow, setSelectedFlow] = useState<FlowDetail | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadHostData();
  }, [user]);

  const loadHostData = async () => {
    try {
      setLoading(true);

      const meResponse = await api.get("/auth/me");
      const hostInfo = meResponse.data;
      setHostData(hostInfo);

      if (hostInfo.qrDataUrl) {
        setQrImage(hostInfo.qrDataUrl);
      }

      try {
        const guestsResponse = await api.get("/dashboard/host/guests");
        setGuests(guestsResponse.data);
      } catch (guestError) {
        console.log("No guests found");
        setGuests([]);
      }

    } catch (error) {
      console.error("Error loading host data:", error);
      Alert.alert("Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCallHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/notifications/call-history");
      setCallHistory(response.data.calls || []);
    } catch (error) {
      console.error("Error loading call history:", error);
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadFlowsWithMessages = async () => {
    try {
      setLoadingFlows(true);
      const response = await api.get(`/flows/history/${user?.id}`);
      
      if (response.data.success) {
        const flowsData = response.data.flows || [];
        
        // Transformar datos para mostrar
        const transformedFlows = flowsData.map((flow: any) => {
          const unreadMessages = flow.messages?.filter((msg: any) => 
            msg.sender === 'guest' && !msg.read
          ).length || 0;
          
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
      }
    } catch (error) {
      console.error('Error cargando flujos:', error);
      // Si el endpoint no existe, usar call-history
      loadCallHistory();
    } finally {
      setLoadingFlows(false);
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

  useEffect(() => {
    if (activeTab === 'history') {
      loadCallHistory();
    } else if (activeTab === 'messages') {
      loadFlowsWithMessages();
    }
  }, [activeTab]);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí",
        onPress: () => {
          logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const refreshData = () => {
    if (activeTab === 'info') loadHostData();
    else if (activeTab === 'history') loadCallHistory();
    else if (activeTab === 'messages') loadFlowsWithMessages();
  };

  const generateQRCode = async () => {
    loadHostData();
  };

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-ES", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString("es-ES", {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // Formatear fecha relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} d`;
    } else {
      return date.toLocaleDateString("es-ES", {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const { date } = formatDateTime(item.createdAt);
    return (
      <View style={styles.guestItem}>
        <Text style={styles.guestName}>{item.name}</Text>
        <Text style={styles.guestEmail}>{item.email}</Text>
        <Text style={styles.guestDate}>
          Registrado: {date}
        </Text>
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const created = formatDateTime(item.createdAt);
    const answered = item.answeredAt ? formatDateTime(item.answeredAt) : null;
    
    return (
      <View style={[
        styles.historyItem,
        item.status === 'answered' && styles.answeredItem
      ]}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyGuestName}>{item.guestName}</Text>
          <Text style={[
            styles.historyStatus,
            item.response === 'accept' ? styles.accepted : styles.rejected
          ]}>
            {item.response === 'accept' ? '✅ Aceptado' : 
             item.response === 'reject' ? '❌ Rechazado' : '⏳ Pendiente'}
          </Text>
        </View>
        <Text style={styles.historyEmail}>{item.guestEmail}</Text>
        
        {/* Fecha y hora separadas */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Creado:</Text>
          <Text style={styles.timeValue}>{created.date} a las {created.time}</Text>
        </View>
        
        {answered && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Respondido:</Text>
            <Text style={styles.timeValue}>{answered.date} a las {answered.time}</Text>
          </View>
        )}
      </View>
    );
  };

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
          <Text style={styles.flowTime}>{formatRelativeTime(item.lastMessageTime)}</Text>
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
          {item.sender === 'host' ? 'Tú' : selectedFlow?.guestName || 'Invitado'}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <Text style={[
        styles.messageText,
        item.sender === 'host' ? styles.hostMessageText : styles.guestMessageText
      ]}>
        {item.message}
      </Text>
    </View>
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
  }, [activeTab]);

  if (loading && activeTab === 'info') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando datos...</Text>
        <TouchableOpacity style={styles.button} onPress={refreshData}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DoorbellNotificationHandler />
      
      {/* Header con Logo */}
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Panel Principal</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            Información
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'guests' && styles.activeTab]}
          onPress={() => setActiveTab('guests')}
        >
          <Text style={[styles.tabText, activeTab === 'guests' && styles.activeTabText]}>
            Contactos ({guests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Historial
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Mensajes
            {flows.filter(f => f.unreadMessages > 0).length > 0 && (
              <Text style={styles.unreadTabIndicator}> •</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7D1522']}
          />
        }
      >
        {activeTab === 'info' && (
          <>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tu información</Text>
              <Text style={styles.infoText}>Nombre: {user?.name}</Text>
              <Text style={styles.infoText}>Email: {user?.email}</Text>
              <Text style={styles.infoText}>Código QR: {hostData?.qrCode || user?.qrCode || "No disponible"}</Text>
            </View>

            {qrImage ? (
              <View style={styles.qrSection}>
                <Text style={styles.sectionTitle}>Tu Código QR</Text>
                <Image
                  source={{ uri: qrImage }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrDescription}>
                  Los visitantes pueden escanear este código QR para contactarte
                </Text>
              </View>
            ) : (
              <View style={styles.noQrSection}>
                <Text style={styles.noQrText}>
                  Todavía no tienes un código QR generado
                </Text>
                <TouchableOpacity style={styles.button} onPress={generateQRCode}>
                  <Text style={styles.buttonText}>Actualizar QR</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'guests' && (
          <View style={styles.guestsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Tus contactos ({guests.length})
              </Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {guests.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay contactos aún. Comparte tu código QR para que se unan.
              </Text>
            ) : (
              <FlatList
                data={guests}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={renderGuestItem}
              />
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de Llamadas</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <Text style={styles.emptyText}>Cargando historial...</Text>
            ) : callHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay llamadas en el historial
              </Text>
            ) : (
              <FlatList
                data={callHistory}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
              />
            )}
          </View>
        )}

        {activeTab === 'messages' && (
          <View style={styles.messagesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Mensajes de contactos ({flows.length})
              </Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingFlows ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#7D1522" />
                <Text style={styles.loadingText}>Cargando mensajes...</Text>
              </View>
            ) : flows.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No hay mensajes aún</Text>
                <Text style={styles.emptyText}>
                  Tus contactos aparecerán aquí cuando envíen mensajes o realicen videollamadas
                </Text>
              </View>
            ) : (
              <FlatList
                data={flows}
                scrollEnabled={false}
                keyExtractor={(item) => item._id}
                renderItem={renderFlowItem}
              />
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/contacts")}>
            <Text style={styles.secondaryButtonText}>Contactos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/messages")}>
            <Text style={styles.secondaryButtonText}>Mensajes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => router.push("/qr/scan")}>
            <Text style={styles.buttonText}>Escanear QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de detalles del mensaje */}
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
                      {formatRelativeTime(selectedFlow.createdAt)}
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: '#FAFFFF',
  },
  loadingText: {
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7D1522',
  },
  tabText: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
  },
  unreadTabIndicator: {
    color: '#ff0019ff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  qrSection: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  noQrSection: {
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 20,
    marginBottom: 20,
    borderColor: "#FFEBB2",
    borderWidth: 1,
  },
  guestsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  historySection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  messagesSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  infoText: {
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
    marginBottom: 8,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 15,
  },
  qrDescription: {
    textAlign: "center",
    color: "#666",
    marginBottom: 10,
    fontFamily: "BaiJamjuree",
    fontSize: 14,
  },
  noQrText: {
    fontSize: 16,
    textAlign: "center",
    color: "#7D1522",
    fontFamily: "BaiJamjuree",
    marginBottom: 15,
  },
  guestItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7D1522',
  },
  guestName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  guestEmail: {
    color: "#666",
    fontFamily: "BaiJamjuree",
    fontSize: 14,
  },
  guestDate: {
    color: "#999",
    fontSize: 12,
    marginTop: 5,
    fontFamily: "BaiJamjuree",
  },
  historyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    borderRadius: 8,
  },
  answeredItem: {
    backgroundColor: '#F0F8FF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyGuestName: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: "BaiJamjuree",
  },
  accepted: {
    color: '#28a745',
  },
  rejected: {
    color: '#dc3545',
  },
  historyEmail: {
    color: "#666",
    fontSize: 14,
    fontFamily: "BaiJamjuree",
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeLabel: {
    color: "#666",
    fontSize: 12,
    fontFamily: "BaiJamjuree-Bold",
    marginRight: 5,
    minWidth: 70,
  },
  timeValue: {
    color: "#666",
    fontSize: 12,
    fontFamily: "BaiJamjuree",
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#3D3D3D',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'BaiJamjuree-Bold',
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
    fontFamily: "BaiJamjuree",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 20,
    gap: 12,
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#7D1522",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 14,
    fontFamily: "BaiJamjuree",
  },
  logoutButton: {
    backgroundColor: "#ff0019ff",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 60,
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  // Estilos para mensajes
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
  flowTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'BaiJamjuree',
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
