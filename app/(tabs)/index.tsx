import { AppHero } from '@/components/home/AppHero';
import { ConversationCard } from '@/components/home/ConversationCard';
import { HomeFilters } from '@/components/home/HomeFilters';
import { useHomePage } from '@/hooks/useHomePage';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import AppModal from '../../components/AppModal';
import AppView from '../../components/AppView';
import { PlateRequestStatus, useQrPage } from '../../hooks/useQrPage';

const plateStatusNoticeCopy: Record<Exclude<PlateRequestStatus, 'none'>, { title: string; message: string }> = {
  pending: { title: 'Recibimos tu solicitud', message: 'Ya tenemos tus datos y estamos revisando la solicitud de tu placa.' },
  in_production: { title: 'Tu placa está en fabricación', message: 'Estamos fabricando tu placa. Te vamos a avisar cuando esté lista para instalar.' },
  ready_for_installation: { title: 'Tu placa está lista para instalar', message: 'La placa ya está preparada. Coordiná la instalación con nuestro equipo para colocarla en tu entrada.' },
  installed: { title: '¡Tu placa ya está instalada!', message: 'Tu timbre ya está listo. Ahora podés configurar el nombre, el mensaje y los horarios que verá cada visitante.' },
  rejected: { title: 'Solicitud de placa rechazada', message: 'La solicitud fue rechazada. Revisá el estado de tu placa o solicitá una nueva.' },
};

function formatInstallationDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function HomeScreen() {
  const {
    conversations,
    loading,
    insets,
    keyExtractor,
    totalConversations,
    unreadCount,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    periodFilter,
    setPeriodFilter,
  } = useHomePage()
  const qr = useQrPage();
  const [showPlateOnboarding, setShowPlateOnboarding] = useState(false);
  const [plateStatusNotice, setPlateStatusNotice] = useState<Exclude<PlateRequestStatus, 'none'> | null>(null);

  useEffect(() => {
    if (qr.plateRequestStatus !== 'none' || !qr.qrCode) return;

    const storageKey = `plate-onboarding-seen:${qr.qrCode}`;
    void AsyncStorage.getItem(storageKey).then((seen) => {
      if (!seen) setShowPlateOnboarding(true);
    });
  }, [qr.plateRequestStatus, qr.qrCode]);

  useEffect(() => {
    const currentStatus = qr.plateRequestStatus;
    if (currentStatus === 'none' || qr.status === 'loading' || !qr.qrCode) return;

    const storageKey = `plate-status-seen:${qr.qrCode}:${currentStatus}`;
    void AsyncStorage.getItem(storageKey).then((seen) => {
      if (!seen) setPlateStatusNotice(currentStatus);
    });
  }, [qr.plateRequestStatus, qr.qrCode, qr.status]);

  const dismissPlateOnboarding = async () => {
    if (qr.qrCode) await AsyncStorage.setItem(`plate-onboarding-seen:${qr.qrCode}`, '1');
    setShowPlateOnboarding(false);
  };

  const openPlateRequest = async () => {
    await dismissPlateOnboarding();
    router.push('/qr?openRequest=1');
  };

  const dismissPlateStatusNotice = async () => {
    if (qr.qrCode && plateStatusNotice) {
      await AsyncStorage.setItem(`plate-status-seen:${qr.qrCode}:${plateStatusNotice}`, '1');
    }
    setPlateStatusNotice(null);
  };

  const openBellSetup = async () => {
    await dismissPlateStatusNotice();
    router.push('/profile?setup=1');
  };

  const plateNoticeMessage = plateStatusNotice === 'ready_for_installation' && qr.installationScheduledAt
    ? `${plateStatusNoticeCopy[plateStatusNotice].message} Fecha y horario estimado: ${formatInstallationDateTime(qr.installationScheduledAt)} hs.`
    : plateStatusNotice ? plateStatusNoticeCopy[plateStatusNotice].message : undefined;

  return (
    <AppView style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={keyExtractor}
        renderItem={ConversationCard}
        refreshing={loading}
        ListHeaderComponent={
          <>
            <AppHero total={totalConversations} unread={unreadCount} />
            <HomeFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              total={totalConversations}
              visible={conversations.length}
              periodFilter={periodFilter}
              onPeriodChange={setPeriodFilter}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.centerEmpty}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#B5222A" />
                <Text style={styles.loadingText}>Cargando conversaciones…</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-outline" size={60} color="#9B9294" />
                <Text style={styles.emptyTitle}>{totalConversations === 0 ? 'Todavía no hay mensajes' : 'No encontramos conversaciones'}</Text>
                <Text style={styles.emptyText}>{totalConversations === 0 ? 'Cuando entren mensajes anónimos, tus chats aparecerán aquí.' : 'Probá con otra búsqueda o cambiá el filtro de estado.'}</Text>
              </>
            )}
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      />
      <AppModal
        visible={showPlateOnboarding}
        title="Solicitá tu placa Portero QR"
        message="Tu cuenta ya está lista. Para recibir la placa física que vas a colocar en la entrada, necesitamos tu dirección exacta y un teléfono de contacto."
        onClose={() => void dismissPlateOnboarding()}
        actions={[
          { label: 'Ahora no', variant: 'secondary', onPress: dismissPlateOnboarding },
          { label: 'Solicitar placa', onPress: openPlateRequest },
        ]}
      />
      <AppModal
        visible={Boolean(plateStatusNotice)}
        title={plateStatusNotice ? plateStatusNoticeCopy[plateStatusNotice].title : ''}
        message={plateNoticeMessage}
        onClose={() => void dismissPlateStatusNotice()}
        actions={plateStatusNotice === 'installed'
          ? [
              { label: 'Ahora no', variant: 'secondary', onPress: dismissPlateStatusNotice },
              { label: 'Configurar timbre', onPress: openBellSetup },
            ]
          : [{ label: 'Entendido' }]}
      />
    </AppView>
  );
}

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
  email: {
    marginTop: 2,
    color: '#5F5759',
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
    color: '#5F5759',
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
