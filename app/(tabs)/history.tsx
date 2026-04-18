import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

type CallItem = {
  _id: string;
  guestName: string;
  guestEmail?: string | null;
  status: 'pending' | 'answered' | 'timeout' | 'rejected';
  response?: 'accept' | 'reject' | 'timeout' | null;
  createdAt: string;
  answeredAt?: string | null;
  hostId?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string | null;
};

export default function HistoryScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '30', page: '1' };
      if (user?.role === 'admin') {
        params.hostId = '';
      }

      const response = await api.get('/notifications/call-history', { params });
      setCalls(response.data.calls || []);
    } catch (error: any) {
      console.error('Error loading call history:', error);
      const message = error.response?.data?.error || 'No se pudo cargar el historial';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusLabel = (status: CallItem['status']) => {
    switch (status) {
      case 'answered':
        return 'Respondida';
      case 'timeout':
        return 'Timeout';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  const renderItem = ({ item }: { item: CallItem }) => {
    const hostName =
      typeof item.hostId === 'object' && item.hostId ? item.hostId.name || 'Host' : 'Host';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <Ionicons name="call" size={18} color="#7D1522" />
          </View>
          <View style={styles.meta}>
            <Text style={styles.name}>{item.guestName}</Text>
            <Text style={styles.email}>{item.guestEmail || 'Sin email'}</Text>
          </View>
          <View style={[styles.statusChip, item.status === 'answered' ? styles.statusAnswered : null]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        <Text style={styles.detail}>Host: {hostName}</Text>
        <Text style={styles.detail}>Fecha: {formatDate(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Log de llamadas recientes</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : calls.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>Sin llamadas registradas</Text>
          <Text style={styles.emptyText}>Cuando lleguen llamadas, aparecerán aquí.</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FAFFFF',
  },
  title: {
    fontSize: 28,
    fontFamily: 'BaiJamjuree-Bold',
    color: '#3D3D3D',
  },
  subtitle: {
    marginTop: 4,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
  },
  meta: {
    flex: 1,
  },
  name: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 15,
  },
  email: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F2F2F2',
  },
  statusAnswered: {
    backgroundColor: '#E7F6EA',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'BaiJamjuree-Bold',
    color: '#3D3D3D',
  },
  detail: {
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
