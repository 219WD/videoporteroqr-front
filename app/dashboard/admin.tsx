// app/dashboard/admin.tsx - VERSIÓN ACTUALIZADA
import { router } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../utils/api";

interface Host {
  id: string;
  name: string;
  email: string;
  qrCode: string;
  createdAt: string;
}

interface Guest {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  hostRef?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Stats {
  totals: {
    hosts: number;
    guests: number;
    calls: number;
    answeredCalls: number;
    answerRate: string;
  };
  activeHosts: {
    host: Host;
    callCount: number;
  }[];
}

type TabType = 'stats' | 'hosts' | 'guests';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'stats' && !stats) {
      loadStats();
    }
  }, [activeTab]);

  const loadAdminData = async () => {
    try {
      const [hostsResponse, guestsResponse] = await Promise.all([
        api.get("/dashboard/admin/hosts"),
        api.get("/dashboard/admin/guests")
      ]);
      
      setHosts(hostsResponse.data);
      setGuests(guestsResponse.data);
    } catch (error) {
      console.error("Error loading admin data:", error);
      Alert.alert("Error", "No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get("/dashboard/admin/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí", 
        onPress: () => {
          logout();
          router.replace("/(tabs)/auth/login");
        }
      }
    ]);
  };

  const refreshData = () => {
    if (activeTab === 'stats') loadStats();
    else loadAdminData();
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando datos de administración...</Text>
        <TouchableOpacity style={styles.button} onPress={refreshData}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con Logo */}
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Panel de Administración</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Estadísticas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'hosts' && styles.activeTab]}
          onPress={() => setActiveTab('hosts')}
        >
          <Text style={[styles.tabText, activeTab === 'hosts' && styles.activeTabText]}>
            Hosts ({hosts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'guests' && styles.activeTab]}
          onPress={() => setActiveTab('guests')}
        >
          <Text style={[styles.tabText, activeTab === 'guests' && styles.activeTabText]}>
            Guests ({guests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'stats' && stats && (
          <View style={styles.statsSection}>
            <Text style={styles.title}>Estadísticas del Sistema</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totals.hosts}</Text>
                <Text style={styles.statLabel}>Hosts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totals.guests}</Text>
                <Text style={styles.statLabel}>Guests</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totals.calls}</Text>
                <Text style={styles.statLabel}>Llamadas</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totals.answerRate}%</Text>
                <Text style={styles.statLabel}>Tasa Respuesta</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Hosts Más Activos</Text>
            {stats.activeHosts.map((item, index) => (
              <View key={item.host.id} style={styles.activeHost}>
                <View style={styles.hostRank}>
                  <Text style={styles.hostRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>{item.host.name}</Text>
                  <Text style={styles.hostEmail}>{item.host.email}</Text>
                </View>
                <Text style={styles.callCount}>{item.callCount} llamadas</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'hosts' && (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hosts Registrados ({hosts.length})</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
            {hosts.length === 0 ? (
              <Text style={styles.emptyText}>No hay hosts registrados</Text>
            ) : (
              <FlatList
                data={hosts}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.listItem}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemEmail}>{item.email}</Text>
                    <Text style={styles.itemDetail}>
                      Código QR: {item.qrCode}
                    </Text>
                    <Text style={styles.itemDate}>
                      Registrado: {formatDate(item.createdAt)}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {activeTab === 'guests' && (
          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Guests Registrados ({guests.length})</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={refreshData}>
                <Text style={styles.secondaryButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
            {guests.length === 0 ? (
              <Text style={styles.emptyText}>No hay guests registrados</Text>
            ) : (
              <FlatList
                data={guests}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.listItem}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemEmail}>{item.email}</Text>
                    {item.hostRef && (
                      <View style={styles.hostRef}>
                        <Text style={styles.hostRefLabel}>Host:</Text>
                        <Text style={styles.hostRefText}>{item.hostRef.name} ({item.hostRef.email})</Text>
                      </View>
                    )}
                    <Text style={styles.itemDate}>
                      Registrado: {formatDate(item.createdAt)}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={refreshData}>
            <Text style={styles.buttonText}>Actualizar</Text>
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
  statsSection: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FAFAFA',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statNumber: {
    fontSize: 28,
    color: '#7D1522',
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: "BaiJamjuree",
  },
  sectionTitle: {
    fontSize: 18,
    color: "#3D3D3D",
    fontFamily: "BaiJamjuree-Bold",
    marginBottom: 15,
  },
  activeHost: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7D1522',
  },
  hostRank: {
    backgroundColor: '#7D1522',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostRankText: {
    color: '#FAFFFF',
    fontSize: 14,
    fontFamily: "BaiJamjuree-Bold",
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 16,
    color: "#3D3D3D",
    marginBottom: 2,
  },
  hostEmail: {
    color: '#666',
    fontSize: 12,
    fontFamily: "BaiJamjuree",
  },
  callCount: {
    fontFamily: "BaiJamjuree-Bold",
    color: '#28a745',
    fontSize: 14,
  },
  listSection: {
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
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7D1522',
  },
  itemName: {
    fontFamily: "BaiJamjuree-Bold",
    fontSize: 16,
    color: "#3D3D3D",
    marginBottom: 4,
  },
  itemEmail: {
    color: "#666",
    fontFamily: "BaiJamjuree",
    fontSize: 14,
    marginBottom: 8,
  },
  itemDetail: {
    color: "#666",
    fontSize: 12,
    fontFamily: "BaiJamjuree",
    marginBottom: 4,
  },
  itemDate: {
    color: "#999",
    fontSize: 12,
    fontFamily: "BaiJamjuree",
    marginTop: 4,
  },
  hostRef: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  hostRefLabel: {
    color: "#666",
    fontSize: 12,
    fontFamily: "BaiJamjuree-Bold",
    marginRight: 5,
  },
  hostRefText: {
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