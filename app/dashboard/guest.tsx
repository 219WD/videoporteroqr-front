// app/dashboard/guest.tsx - VERSIÓN COMPLETA CON SOCKET.IO
import { router } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import io from "socket.io-client";
import { AuthContext } from "../../context/AuthContext";
import { useVideoCall } from "../../context/VideoCallContext";
import { api } from "../../utils/api";

interface Message {
  sender: "host" | "guest";
  message: string;
  timestamp: string;
}

interface CallWithMessages {
  _id: string;
  guestName: string;
  guestEmail: string;
  status: "pending" | "answered" | "timeout";
  response?: "accept" | "reject";
  messages: Message[];
  createdAt: string;
  answeredAt?: string;
  timeoutAt?: string;
}

type TabType = "current" | "messages";

export default function GuestDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { joinCall } = useVideoCall();
  const [hostInfo, setHostInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const [callsWithMessages, setCallsWithMessages] = useState<
    CallWithMessages[]
  >([]);
  const [selectedCall, setSelectedCall] = useState<CallWithMessages | null>(
    null
  );
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [lastCallId, setLastCallId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<
    "none" | "pending" | "answered" | "timeout"
  >("none");
  const [pollingCount, setPollingCount] = useState(0);

  const socketRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadGuestData();

    return () => {
      // Limpiar recursos al desmontar
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === "messages") {
      loadCallsWithMessages();
    }
  }, [activeTab]);

  // Polling para verificar estado de la última llamada (como fallback)
  useEffect(() => {
    if (lastCallId && callStatus === "pending") {
      console.log("🔄 Iniciando polling para llamada:", lastCallId);

      let attemptCount = 0;

      pollingIntervalRef.current = setInterval(() => {
        attemptCount++;
        setPollingCount(attemptCount);
        console.log(
          `🔍 Verificando estado de llamada ${lastCallId} (intento ${attemptCount})`
        );
        checkCallStatus(lastCallId);
      }, 3000);

      // Timeout después de 35 segundos
      const timeout = setTimeout(() => {
        if (callStatus === "pending") {
          console.log("⏰ Polling timeout después de 35 segundos");
          setCallStatus("timeout");
          cleanupSocket();
          Alert.alert(
            "⏰ El host no respondió",
            "Puedes enviar un mensaje al host.",
            [
              {
                text: "Enviar Mensaje",
                onPress: () => {
                  loadCallForMessaging(lastCallId);
                },
              },
              { text: "OK" },
            ]
          );
        }
      }, 35 * 1000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        clearTimeout(timeout);
      };
    }
  }, [lastCallId, callStatus]);

  const loadGuestData = async () => {
    try {
      const meResponse = await api.get("/auth/me");
      const guestData = meResponse.data;

      console.log("🔍 Guest data:", guestData);
      console.log("🔍 HostRef data:", guestData.hostRef);

      if (guestData.hostRef && guestData.hostRef._id) {
        setHostInfo(guestData.hostRef);
        console.log("🔍 Host info set:", guestData.hostRef);
      } else {
        console.log("🔍 No hostRef found");
        setHostInfo(null);
      }
    } catch (error) {
      console.error("Error loading guest data:", error);
      Alert.alert("Error", "No se pudieron cargar los datos del usuario");
    } finally {
      setLoading(false);
    }
  };

  const loadCallsWithMessages = async () => {
    try {
      const response = await api.get("/messages/my-calls");
      setCallsWithMessages(response.data.calls);
    } catch (error) {
      console.error("Error loading calls with messages:", error);
    }
  };

  const checkCallStatus = async (callId: string) => {
    try {
      const response = await api.get(`/notifications/call-status/${callId}`);
      const call = response.data;

      console.log("🔍 Estado de llamada:", call.status);

      if (call.status === "answered") {
        setCallStatus("answered");
        cleanupSocket();
        Alert.alert(
          "📞 Llamada Respondida",
          call.response === "accept"
            ? "✅ El host te ha aceptado"
            : "❌ El host te ha rechazado"
        );
      } else if (call.status === "timeout") {
        setCallStatus("timeout");
        cleanupSocket();
        Alert.alert(
          "⏰ Llamada Expirada",
          "El host no respondió. Puedes enviar un mensaje.",
          [
            { text: "OK" },
            {
              text: "Enviar Mensaje",
              onPress: () => {
                loadCallForMessaging(callId);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("❌ Error checking call status:", error.response?.status);

      if (error.response?.status === 404) {
        console.log("⏰ Llamada no encontrada - probablemente expiró");
        setCallStatus("timeout");
        cleanupSocket();
        Alert.alert(
          "⏰ Llamada Expirada",
          "El host no respondió. Puedes enviar un mensaje.",
          [
            { text: "OK" },
            {
              text: "Enviar Mensaje",
              onPress: () => {
                createNewConversation();
              },
            },
          ]
        );
      }
    }
  };

  const loadCallForMessaging = async (callId: string) => {
    try {
      console.log(`📝 Cargando llamada ${callId} para mensajes`);
      const response = await api.get(`/messages/${callId}`);

      const call = response.data.call;
      setSelectedCall(call);
      setActiveTab("messages");
    } catch (error: any) {
      console.error("❌ Error loading call for messaging:", error);

      if (error.response?.status === 404) {
        Alert.alert(
          "💬 Iniciar Conversación",
          "La llamada expiró. ¿Quieres enviar un mensaje al host?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Enviar Mensaje",
              onPress: () => {
                createNewConversation();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", "No se pudo cargar la conversación");
      }
    }
  };

  const createNewConversation = async () => {
    try {
      if (!hostInfo) {
        Alert.alert("Error", "No estás en ninguna sala");
        return;
      }

      console.log("📝 Creando nueva conversación para mensajes");

      const response = await api.post("/notifications/call-host");
      const callId = response.data.callId;

      try {
        await api.post("/notifications/respond-call", {
          callId,
          response: "accept",
        });

        const messagesResponse = await api.get(`/messages/${callId}`);
        setSelectedCall(messagesResponse.data.call);
        setActiveTab("messages");
      } catch (responseError) {
        console.error("Error marcando llamada como aceptada:", responseError);
        loadCallForMessaging(callId);
      }
    } catch (error) {
      console.error("❌ Error creating new conversation:", error);
      Alert.alert("Error", "No se pudo iniciar la conversación");
    }
  };

  const startAudioCallWithHost = async () => {
    if (!hostInfo || !user) return;

    try {
      console.log("🎥 Iniciando llamada con el host...");

      const videoCallResponse = await api.post("/videocall/start-automatic");
      const callId = videoCallResponse.data.callId;

      // Unirse a la llamada como guest
      await joinCall(callId, user.id, "guest");

      // Navegar a la pantalla de llamada
      router.push("/video-call");
    } catch (error) {
      console.error("Error iniciando llamada:", error);
      Alert.alert("Error", "No se pudo iniciar la llamada");
    }
  };

  const setupSocketForRealTimeResponse = (callId: string) => {
    try {
      console.log("🔌 Configurando Socket.io para respuesta en tiempo real...");

      socketRef.current = io("https://videoporteroqr-back.onrender.com", {
        transports: ["websocket"],
      });

      // Escuchar respuesta del host EN TIEMPO REAL
      socketRef.current.on("call-response", (data: any) => {
        console.log("🔔 Respuesta recibida en tiempo real:", data);

        if (data.callId === callId) {
          setCallStatus("answered");
          cleanupSocket();

          if (data.response === "accept") {
            Alert.alert(
              "✅ Aceptado",
              "El host te ha aceptado. ¿Quieres iniciar la llamada?",
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                },
                {
                  text: "Iniciar Llamada",
                  onPress: () => {
                    startAudioCallWithHost();
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              "❌ Rechazado",
              "El host no puede atenderte en este momento"
            );
          }
        }
      });

      socketRef.current.on("connect", () => {
        console.log("✅ Conectado al servidor de notificaciones");
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔌 Desconectado del servidor de notificaciones");
      });

      socketRef.current.on("error", (error: any) => {
        console.error("❌ Error en Socket.io:", error);
      });
    } catch (error) {
      console.error("Error configurando Socket.io:", error);
    }
  };

  const cleanupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleRealCallHost = async () => {
    if (!hostInfo) {
      Alert.alert("Error", "No estás en ninguna sala");
      return;
    }

    try {
      setCalling(true);
      setCallStatus("pending");
      setPollingCount(0);
      Vibration.vibrate(100);

      // ✅ 1. PRIMERO: Enviar notificación al host via API
      const response = await api.post("/notifications/call-host");
      console.log("🔔 Notificación enviada al host:", response.data);

      const callId = response.data.callId;
      setLastCallId(callId);

      // ✅ 2. SEGUNDO: Enviar notificación en tiempo real via Socket.io
      if (socketRef.current) {
        socketRef.current.emit("call-host", {
          hostId: hostInfo._id || hostInfo.id,
          call: {
            _id: callId,
            guestName: user?.name || "Invitado",
            guestEmail: user?.email || "",
            hostId: hostInfo._id || hostInfo.id,
            createdAt: new Date().toISOString(),
            status: "pending",
          },
        });
        console.log("🔔 Notificación Socket.io enviada al host:", hostInfo._id);
      }

      // ✅ 3. Configurar Socket.io para respuesta en tiempo real
      setupSocketForRealTimeResponse(callId);

      Alert.alert(
        "✅ Llamada Enviada",
        `Se ha notificado a ${
          hostInfo.name || "el host"
        }\n\nEsperando respuesta...`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("❌ Error en llamada:", error);
      const errorMessage =
        error.response?.data?.error || "No se pudo contactar al host";
      Alert.alert("Error", errorMessage);
      setCallStatus("none");
      setLastCallId(null);
      cleanupSocket();
    } finally {
      setCalling(false);
    }
  };

  const sendMessage = async (callId: string) => {
    if (!newMessage.trim()) {
      Alert.alert("Error", "El mensaje no puede estar vacío");
      return;
    }

    try {
      setSendingMessage(true);

      const response = await api.post("/messages/send", {
        callId,
        message: newMessage.trim(),
      });

      setNewMessage("");

      if (selectedCall) {
        const messagesResponse = await api.get(`/messages/${callId}`);
        setSelectedCall(messagesResponse.data.call);
      }

      loadCallsWithMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage =
        error.response?.data?.error || "Error enviando mensaje";
      Alert.alert("Error", errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const openCallMessages = async (call: CallWithMessages) => {
    try {
      const response = await api.get(`/messages/${call._id}`);
      setSelectedCall(response.data.call);
    } catch (error) {
      console.error("Error loading call messages:", error);
      Alert.alert("Error", "No se pudo cargar la conversación");
    }
  };

  const resetCallState = () => {
    setCallStatus("none");
    setLastCallId(null);
    setPollingCount(0);
    cleanupSocket();
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí",
        onPress: () => {
          cleanupSocket();
          logout();
          router.replace("/(tabs)/auth/login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (selectedCall) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedCall(null);
              loadCallsWithMessages();
            }}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.chatTitle}>
            Conversación con {hostInfo?.name || "el host"}
          </Text>
        </View>

        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {selectedCall.messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                No hay mensajes aún. Sé el primero en escribir.
              </Text>
            </View>
          ) : (
            selectedCall.messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  message.sender === "guest"
                    ? styles.guestMessage
                    : styles.hostMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageSender,
                    message.sender === "guest"
                      ? styles.guestSender
                      : styles.hostSender,
                  ]}
                >
                  {message.sender === "guest" ? "Tú" : "Host"}
                </Text>
                <Text
                  style={[
                    styles.messageText,
                    message.sender === "guest"
                      ? styles.guestText
                      : styles.hostText,
                  ]}
                >
                  {message.message}
                </Text>
                <Text style={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sendingMessage) &&
                styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(selectedCall._id)}
            disabled={sendingMessage || !newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>
              {sendingMessage ? "Enviando..." : "Enviar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con Logo */}
      <View style={styles.mainHeader}>
        <Image
          source={{
            uri: "https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png",
          }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Panel de Invitado</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "current" && styles.activeTab]}
          onPress={() => {
            setActiveTab("current");
            resetCallState();
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "current" && styles.activeTabText,
            ]}
          >
            Sala Actual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "messages" && styles.activeTab]}
          onPress={() => {
            setActiveTab("messages");
            loadCallsWithMessages();
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "messages" && styles.activeTabText,
            ]}
          >
            Mensajes
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "current" && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {hostInfo ? (
            <View style={styles.hostSection}>
              <Text style={styles.sectionTitle}>Estás en la sala de:</Text>

              {/* Sección de información del host */}
              <View style={styles.hostInfoSection}>
                <Text style={styles.hostName}>
                  {hostInfo.name || "Nombre no disponible"}
                </Text>
                <Text style={styles.hostEmail}>
                  {hostInfo.email || "Email no disponible"}
                </Text>
              </View>

              <View style={styles.callSection}>
                <Text style={styles.callTitle}>🔔 Llamar al Host</Text>
                <Text style={styles.callDescription}>
                  Presiona para notificar al host que estás en la puerta. El
                  host recibirá una notificación instantánea.
                </Text>

                <View
                  style={[
                    styles.callStatus,
                    callStatus === "pending" && styles.callStatusPending,
                    callStatus === "answered" && styles.callStatusAnswered,
                    callStatus === "timeout" && styles.callStatusTimeout,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      callStatus === "pending" && styles.statusPending,
                      callStatus === "answered" && styles.statusAnswered,
                      callStatus === "timeout" && styles.statusTimeout,
                    ]}
                  >
                    {callStatus === "none" && "Listo para llamar"}
                    {callStatus === "pending" &&
                      `⏳ Esperando respuesta... (${pollingCount})`}
                    {callStatus === "answered" && "✅ Llamada respondida"}
                    {callStatus === "timeout" &&
                      "⏰ No respondió - Envía mensaje"}
                  </Text>
                </View>

                {/* Botones */}
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      (calling || callStatus === "pending") &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleRealCallHost}
                    disabled={calling || callStatus === "pending"}
                  >
                    <Text style={styles.buttonText}>
                      {calling ? "Llamando..." : "🔔 Llamar al Host"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      if (lastCallId) {
                        loadCallForMessaging(lastCallId);
                      } else {
                        createNewConversation();
                      }
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      💬 Mensaje Directo
                    </Text>
                  </TouchableOpacity>
                </View>

                {(callStatus === "pending" || callStatus === "timeout") && (
                  <View style={styles.messageActions}>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={resetCallState}
                    >
                      <Text style={styles.outlineButtonText}>🔄 Reiniciar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => {
                  Alert.alert("Salir de la sala", "¿Estás seguro?", [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Sí, salir",
                      onPress: async () => {
                        try {
                          cleanupSocket();
                          await api.post("/auth/leave-host");
                          setHostInfo(null);
                          resetCallState();
                          Alert.alert("Éxito", "Has salido de la sala");
                        } catch (error: any) {
                          Alert.alert(
                            "Error",
                            error.response?.data?.error || "Error al salir"
                          );
                        }
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.leaveButtonText}>Salir de esta sala</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noHostSection}>
              <Text style={styles.noHostText}>No estás en ninguna sala</Text>
              <Text style={styles.noHostSubtext}>
                Escanea un código QR para unirte a una sala
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.push("/qr/scan")}
              >
                <Text style={styles.buttonText}>
                  Unirse a una sala (Escanear QR)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === "messages" && (
        <View style={styles.messagesTab}>
          <View style={styles.messagesHeader}>
            <Text style={styles.sectionTitle}>Tus Conversaciones</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={loadCallsWithMessages}
            >
              <Text style={styles.secondaryButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {callsWithMessages.length === 0 ? (
            <View style={styles.emptyMessagesTab}>
              <Text style={styles.emptyText}>
                No tienes conversaciones activas
              </Text>
              <Text style={styles.emptySubtext}>
                Las conversaciones aparecerán aquí después de llamar al host o
                enviar mensajes
              </Text>
            </View>
          ) : (
            <FlatList
              data={callsWithMessages}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.callItem}>
                  <View style={styles.callHeader}>
                    <Text style={styles.callGuestName}>
                      Conversación con host
                    </Text>
                    <Text
                      style={[
                        styles.callStatusBadge,
                        item.response === "reject" && styles.statusRejected,
                        item.status === "timeout" && styles.statusTimeout,
                        item.response === "accept" && styles.statusAccepted,
                      ]}
                    >
                      {item.response === "reject"
                        ? "❌ Rechazada"
                        : item.status === "timeout"
                        ? "⏰ Expirada"
                        : item.response === "accept"
                        ? "✅ Aceptada"
                        : "📞 Pendiente"}
                    </Text>
                  </View>

                  {item.messages.length > 0 ? (
                    <Text style={styles.lastMessage}>
                      {item.messages[item.messages.length - 1].sender ===
                      "guest"
                        ? "Tú: "
                        : "Host: "}
                      {item.messages[item.messages.length - 1].message}
                    </Text>
                  ) : (
                    <Text style={styles.noMessages}>Sin mensajes aún</Text>
                  )}

                  <Text style={styles.callDate}>
                    {new Date(item.createdAt).toLocaleString("es-ES")}
                  </Text>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => openCallMessages(item)}
                  >
                    <Text style={styles.buttonText}>Abrir Conversación</Text>
                  </TouchableOpacity>
                </View>
              )}
              style={styles.callsList}
            />
          )}
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FAFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFFFF",
  },
  loadingText: {
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 16,
  },
  mainHeader: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FAFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#7D1522",
  },
  tabText: {
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree",
    fontSize: 14,
  },
  activeTabText: {
    color: "#7D1522",
    fontFamily: "BaiJamjuree-Bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  messagesTab: {
    flex: 1,
    padding: 20,
  },
  messagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 15,
  },
  hostSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  hostInfoSection: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#7D1522",
  },
  hostName: {
    fontSize: 20,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 5,
  },
  hostEmail: {
    color: "#666",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
  callSection: {
    backgroundColor: "#FAFAFA",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  callTitle: {
    fontSize: 18,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  callDescription: {
    textAlign: "center",
    marginBottom: 15,
    color: "#666",
    fontFamily: "BaiJamjuree",
    lineHeight: 20,
    fontSize: 14,
  },
  callStatus: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  callStatusPending: {
    backgroundColor: "#FFF9E6",
    borderColor: "#FFEBB2",
  },
  callStatusAnswered: {
    backgroundColor: "#F0F8FF",
    borderColor: "#B3D9FF",
  },
  callStatusTimeout: {
    backgroundColor: "#FFE6E6",
    borderColor: "#F5C6CB",
  },
  statusText: {
    textAlign: "center",
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 14,
  },
  statusPending: {
    color: "#7D1522",
  },
  statusAnswered: {
    color: "#28a745",
  },
  statusTimeout: {
    color: "#dc3545",
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#7D1522",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 60,
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#B8B8B8",
  },
  buttonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#3D3D3D",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
  outlineButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3D3D3D",
    minHeight: 44,
    justifyContent: "center",
  },
  outlineButtonText: {
    color: "#3D3D3D",
    fontSize: 14,
    fontFamily: "BaiJamjuree",
  },
  messageActions: {
    marginTop: 10,
  },
  leaveButton: {
    backgroundColor: "#DC3545",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  leaveButtonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  noHostSection: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  noHostText: {
    fontSize: 18,
    color: "#3D3D3D",
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "BaiJamjuree-Bold",
  },
  noHostSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "BaiJamjuree",
  },
  callItem: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  callHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  callGuestName: {
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 16,
    color: "#3D3D3D",
    flex: 1,
  },
  callStatusBadge: {
    fontSize: 12,
    fontFamily: "BaiJamjuree-Bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusRejected: {
    backgroundColor: "#FFE6E6",
    color: "#DC3545",
  },
  statusTimeout: {
    backgroundColor: "#FFF9E6",
    color: "#7D1522",
  },
  statusAccepted: {
    backgroundColor: "#F0F8FF",
    color: "#28a745",
  },
  lastMessage: {
    color: "#666",
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
    fontFamily: "BaiJamjuree",
  },
  noMessages: {
    color: "#999",
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
    fontFamily: "BaiJamjuree",
  },
  emptyText: {
    textAlign: "center",
    color: "#3D3D3D",
    padding: 20,
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
  emptySubtext: {
    textAlign: "center",
    color: "#666",
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "BaiJamjuree",
  },
  emptyMessagesTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  callsList: {
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    backgroundColor: "white",
  },
  logoutButton: {
    backgroundColor: "#6c757d",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#FAFFFF",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  // Chat styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#7D1522",
    fontSize: 16,
    fontFamily: "BaiJamjuree-Bold",
  },
  chatTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 16,
    color: "#3D3D3D",
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 10,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyMessagesText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "BaiJamjuree",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: "80%",
  },
  guestMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#7D1522",
    borderBottomRightRadius: 4,
  },
  hostMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  messageSender: {
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 12,
    marginBottom: 4,
  },
  guestSender: {
    color: "#FAFFFF",
  },
  hostSender: {
    color: "#666",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "BaiJamjuree",
  },
  guestText: {
    color: "white",
  },
  hostText: {
    color: "#3D3D3D",
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
    color: "#999",
    fontFamily: "BaiJamjuree",
  },
  messageInputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    alignItems: "flex-end",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    backgroundColor: "#FAFAFA",
    fontSize: 16,
    fontFamily: "BaiJamjuree",
  },
  sendButton: {
    backgroundColor: "#7D1522",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#B8B8B8",
  },
  sendButtonText: {
    color: "#FAFFFF",
    fontSize: 14,
    fontFamily: "BaiJamjuree-Bold",
  },
  callDate: {
    color: "#999",
    fontSize: 12,
    marginBottom: 10,
    fontFamily: "BaiJamjuree",
  },
};
