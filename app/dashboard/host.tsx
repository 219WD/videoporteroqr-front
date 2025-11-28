// app/dashboard/host.tsx - VERSIÓN MEJORADA
import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
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

interface DoorbellCall {
  id: string;
  guestName: string;
  guestEmail: string;
  status: 'pending' | 'answered';
  response?: 'accept' | 'reject';
  createdAt: string;
  answeredAt?: string;
}

type TabType = 'guests' | 'history' | 'info';

export default function HostDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [callHistory, setCallHistory] = useState<DoorbellCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [hostData, setHostData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

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
      Alert.alert("Error", "No se pudieron cargar los datos del host");
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get("/notifications/call-history");
      setCallHistory(response.data.calls);
    } catch (error) {
      console.error("Error loading call history:", error);
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadCallHistory();
    }
  }, [activeTab]);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí",
        onPress: () => {
          logout();
          router.replace("/(tabs)/auth/login");
        },
      },
    ]);
  };

  const refreshData = () => {
    if (activeTab === 'info') loadHostData();
    else if (activeTab === 'history') loadCallHistory();
  };

  const generateQRCode = async () => {
    router.push("/register-host");
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

  const renderHistoryItem = ({ item }: { item: DoorbellCall }) => {
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

  if (loading && activeTab === 'info') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando datos del host...</Text>
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
        <Text style={styles.headerTitle}>Panel del Host</Text>
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
            Invitados ({guests.length})
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
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'info' && (
          <>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Tu Información</Text>
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
                  Los invitados pueden escanear este código QR para unirse a tu sala
                </Text>
              </View>
            ) : (
              <View style={styles.noQrSection}>
                <Text style={styles.noQrText}>
                  No tienes un código QR generado
                </Text>
                <TouchableOpacity style={styles.button} onPress={generateQRCode}>
                  <Text style={styles.buttonText}>Generar QR</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'guests' && (
          <View style={styles.guestsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Tus Invitados ({guests.length})
              </Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {guests.length === 0 ? (
              <Text style={styles.emptyText}>
                No hay invitados aún. Comparte tu código QR para que se unan.
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

        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={() => router.push("/qr/scan")}>
            <Text style={styles.buttonText}>Escanear QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
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
    fontSize: 14,
  },
  activeTabText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
  },
  infoSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  qrSection: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  noQrSection: {
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderColor: "#FFEBB2",
    borderWidth: 1,
  },
  guestsSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  historySection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
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
  // MEJORADO: Guest items con borde rojo
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
  // MEJORADO: History items con mejor formato de tiempo
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
  // NUEVO: Estilos para mostrar fecha y hora separadas
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
  emptyText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
    fontFamily: "BaiJamjuree",
    fontSize: 14,
  },
  actions: {
    marginTop: 20,
    gap: 12,
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
};