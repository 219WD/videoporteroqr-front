import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../utils/api';

type ContactItem = {
  id: string;
  name: string;
  email: string;
  roleRelativeToMe: 'host' | 'guest' | 'both';
  roles: Array<'host' | 'guest'>;
  conversationId?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
};

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'No se pudieron cargar los contactos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshContacts = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
  }, [loadContacts]);

  useFocusEffect(
    useCallback(() => {
      refreshContacts();
    }, [refreshContacts]),
  );

  const onRefresh = useCallback(() => {
    refreshContacts();
  }, [refreshContacts]);

  const openChat = async (contact: ContactItem) => {
    try {
      setOpeningChatId(contact.id);
      const response = await api.post('/messages/conversations/resolve', {
        contactUserId: contact.id,
      });

      const conversationId = response.data?.conversation?.conversationId || response.data?.conversation?.id;
      if (!conversationId) {
        throw new Error('No se pudo abrir la conversación');
      }

      router.push({
        pathname: '/messages/[conversationId]',
        params: { conversationId },
      });
    } catch (error: any) {
      const message = error.response?.data?.error || 'No se pudo abrir el chat';
      Alert.alert('Error', message);
    } finally {
      setOpeningChatId(null);
    }
  };

  const handleCall = () => {
    Alert.alert('Llamadas', 'La videollamada estará disponible más adelante.');
  };

  const handleManualRefresh = () => {
    if (refreshing || loading) return;
    onRefresh();
  };

  const getRoleBadgeLabel = (role: 'host' | 'guest') => (role === 'host' ? 'Host' : 'Guest');

  const getRoleSummaryLabel = (roles: Array<'host' | 'guest'>) => {
    if (roles.length > 1) return 'Host y Guest';
    if (roles[0] === 'host') return 'Host';
    if (roles[0] === 'guest') return 'Guest';
    return 'Contacto';
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Sin actividad';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderContact = ({ item }: { item: ContactItem }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color="#7D1522" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.rolesRow}>
              <View style={styles.primaryRoleChip}>
                <Text style={styles.primaryRoleChipText}>{getRoleSummaryLabel(item.roles)}</Text>
              </View>
              {item.roles.map((role) => (
                <View key={role} style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{getRoleBadgeLabel(role)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.activity}>
              {item.lastMessagePreview ? item.lastMessagePreview : `Vinculado el ${formatDate(item.lastMessageAt)}`}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Ionicons name="call-outline" size={18} color="#666" />
            <Text style={styles.callButtonText}>Llamar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.messageButton,
              openingChatId === item.id && styles.messageButtonDisabled,
            ]}
            onPress={() => openChat(item)}
            disabled={openingChatId === item.id}
          >
            {openingChatId === item.id ? (
              <ActivityIndicator size="small" color="#FAFFFF" />
            ) : (
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FAFFFF" />
            )}
            <Text style={styles.messageButtonText}>Mensaje</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Contactos</Text>
            <Text style={styles.subtitle}>Personas vinculadas a tu cuenta</Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshButton, (refreshing || loading) && styles.refreshButtonDisabled]}
            onPress={handleManualRefresh}
            disabled={refreshing || loading}
          >
            {refreshing || loading ? (
              <ActivityIndicator size="small" color="#7D1522" />
            ) : (
              <Ionicons name="refresh-outline" size={18} color="#7D1522" />
            )}
            <Text style={styles.refreshButtonText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7D1522" />
          <Text style={styles.loadingText}>Cargando contactos...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No hay contactos aún</Text>
          <Text style={styles.emptyText}>
            Cuando un host te vincule por QR vas a ver sus datos aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7D1522']} />
          }
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F7F2F3',
    borderWidth: 1,
    borderColor: '#E6D7DA',
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  email: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F7F2F3',
  },
  primaryRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#7D1522',
  },
  primaryRoleChipText: {
    fontFamily: 'BaiJamjuree-Bold',
    color: '#FAFFFF',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  roleChipText: {
    fontFamily: 'BaiJamjuree-Bold',
    color: '#7D1522',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  activity: {
    marginTop: 10,
    color: '#888',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
  },
  callButtonText: {
    color: '#666',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#7D1522',
  },
  messageButtonDisabled: {
    opacity: 0.7,
  },
  messageButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
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
