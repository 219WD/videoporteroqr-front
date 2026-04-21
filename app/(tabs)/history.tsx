import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppView from '../../components/AppView';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

type CallItem = {
  id: string;
  callId: string;
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'timeout' | 'cancelled';
  displayStatus: string;
  answered: boolean;
  durationSeconds: number;
  durationLabel: string;
  createdAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  caller: {
    id: string | null;
    name: string;
    email?: string | null;
  };
  callee: {
    id: string | null;
    name: string;
    email?: string | null;
  };
  endedByName?: string | null;
  reason?: string | null;
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

      const response = await api.get('/calls/history', { params });
      setCalls(response.data.calls || []);
    } catch (error: any) {
      console.error('Error loading call history:', error);
      const message = error.response?.data?.error || 'No se pudo cargar el historial';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const getStatusLabel = (status: CallItem['status'], displayStatus: string) => {
    if (displayStatus) return displayStatus;

    switch (status) {
      case 'accepted':
      case 'ended':
        return 'Respondida';
      case 'timeout':
        return 'Perdida';
      case 'rejected':
        return 'Rechazada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'En curso';
    }
  };

  const renderItem = ({ item }: { item: CallItem }) => {
    const contactName = item.direction === 'outgoing' ? item.callee.name : item.caller.name;
    const contactEmail = item.direction === 'outgoing' ? item.callee.email : item.caller.email;
    const directionLabel = item.direction === 'outgoing' ? 'Llamada saliente' : 'Llamada entrante';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            <Ionicons name="call" size={18} color="#7D1522" />
          </View>
          <View style={styles.meta}>
            <Text style={styles.name}>{contactName}</Text>
            <Text style={styles.email}>{contactEmail || 'Sin correo'}</Text>
          </View>
          <View
            style={[
              styles.statusChip,
              item.displayStatus === 'Respondida' ? styles.statusAnswered : null,
              item.displayStatus === 'Perdida' ? styles.statusMissed : null,
              item.displayStatus === 'Rechazada' ? styles.statusRejected : null,
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(item.status, item.displayStatus)}</Text>
          </View>
        </View>
        <Text style={styles.detail}>{directionLabel}</Text>
        <Text style={styles.detail}>Fecha: {formatDate(item.createdAt)}</Text>
        <Text style={styles.detail}>
          Duración: {item.answered ? item.durationLabel : '00:00'}
        </Text>
        {item.answeredAt ? (
          <Text style={styles.detail}>Respondida: {formatDate(item.answeredAt)}</Text>
        ) : null}
        {item.endedByName ? (
          <Text style={styles.detail}>Finalizada por: {item.endedByName}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <AppView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Registro de llamadas recientes</Text>
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
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />}
        />
      )}
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
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
  statusMissed: {
    backgroundColor: '#FDECEC',
  },
  statusRejected: {
    backgroundColor: '#FCEFD9',
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
