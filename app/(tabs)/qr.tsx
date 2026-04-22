import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import AppView from '../../components/AppView';
import { api } from '../../utils/api';

type ProfileCard = {
  id: string;
  name: string;
  email?: string | null;
  qrCode?: string | null;
};

function getStringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value || '';
}

export default function QrScreen() {
  const { user } = useContext(AuthContext);
  const params = useLocalSearchParams();
  const { height } = useWindowDimensions();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [openingCall, setOpeningCall] = useState(false);
  const [linkedProfile, setLinkedProfile] = useState<ProfileCard | null>(null);
  const qrBoxMinHeight = Math.max(210, Math.min(260, Math.round(height * 0.3)));

  const loadQr = useCallback(async () => {
    try {
      setQrLoading(true);
      setQrError(null);

      const response = await api.get('/auth/qr');
      setQrDataUrl(response.data?.qrDataUrl || null);
    } catch (error: any) {
      console.error('Error generando QR dinamico:', error);
      setQrDataUrl(null);
      setQrError(error.response?.data?.error || 'No se pudo generar el QR.');
    } finally {
      setQrLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQr();
    }, [loadQr]),
  );

  useEffect(() => {
    const linkedUserId = getStringParam(params.linkedUserId as string | string[] | undefined);
    if (!linkedUserId) return;

    const linkedUserName = getStringParam(params.linkedUserName as string | string[] | undefined);
    const linkedUserEmail = getStringParam(params.linkedUserEmail as string | string[] | undefined);
    const linkedUserQrCode = getStringParam(params.linkedUserQrCode as string | string[] | undefined);

    setLinkedProfile({
      id: linkedUserId,
      name: linkedUserName || 'Usuario vinculado',
      email: linkedUserEmail || null,
      qrCode: linkedUserQrCode || null,
    });

    router.setParams({
      linkedUserId: undefined,
      linkedUserName: undefined,
      linkedUserEmail: undefined,
      linkedUserQrCode: undefined,
    });
  }, [params.linkedUserEmail, params.linkedUserId, params.linkedUserName, params.linkedUserQrCode]);

  const openScanner = () => {
    router.push('/qr-scan');
  };

  const regenerateQr = () => {
    loadQr();
  };

  const openChatWithProfile = async () => {
    if (!linkedProfile?.id) return;

    try {
      setOpeningChat(true);
      const response = await api.post('/messages/conversations/resolve', {
        contactUserId: linkedProfile.id,
      });

      const conversationId = response.data?.conversation?.conversationId || response.data?.conversation?.id;
      if (!conversationId) {
        throw new Error('No se pudo abrir la conversacion');
      }

      router.push({
        pathname: '/messages/[conversationId]',
        params: { conversationId },
      });
    } catch (error: any) {
      console.error('Error abriendo chat desde QR:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo abrir el chat.');
    } finally {
      setOpeningChat(false);
    }
  };

  const startCallWithProfile = async () => {
    if (!linkedProfile?.id) return;

    try {
      setOpeningCall(true);
      const response = await api.post('/calls/sessions', {
        contactUserId: linkedProfile.id,
      });

      const callId = response.data?.call?.callId;
      if (!callId) {
        throw new Error('No se pudo iniciar la llamada');
      }

      router.push({
        pathname: '/calls/[callId]',
        params: {
          callId,
          role: 'caller',
        },
      });
    } catch (error: any) {
      console.error('Error iniciando llamada desde QR:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo iniciar la llamada.');
    } finally {
      setOpeningCall(false);
    }
  };

  return (
    <AppView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>QR</Text>
          <Text style={styles.title}>Tu codigo y escaner</Text>
          <Text style={styles.subtitle}>
            Muestra tu QR para que te vinculen y abre el scanner en pantalla completa para leer el QR de otro usuario.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mi QR</Text>
          <View style={[styles.qrBox, { minHeight: qrBoxMinHeight }]}>
            {qrLoading ? (
              <ActivityIndicator size="large" color="#7D1522" />
            ) : qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <View style={styles.qrFallback}>
                <Ionicons name="qr-code-outline" size={52} color="#7D1522" />
                <Text style={styles.fallbackText}>{qrError || 'No hay QR disponible'}</Text>
              </View>
            )}
          </View>
          <Text style={styles.helperText}>
            {user?.qrCode
              ? 'Este es el codigo de tu cuenta.'
              : 'Inicia sesion nuevamente si el QR no aparece.'}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={regenerateQr} disabled={qrLoading}>
            {qrLoading ? (
              <ActivityIndicator size="small" color="#7D1522" />
            ) : (
              <Ionicons name="refresh-outline" size={18} color="#7D1522" />
            )}
            <Text style={styles.secondaryButtonText}>
              {qrDataUrl ? 'Regenerar QR' : 'Reintentar QR'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Escanear QR</Text>
          <Text style={styles.helperText}>
            Abre una pantalla dedicada con overlay de scanner para vincular el QR de otro usuario.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={openScanner}>
            <Ionicons name="scan" size={18} color="#FAFFFF" />
            <Text style={styles.primaryButtonText}>Abrir scanner</Text>
          </TouchableOpacity>
        </View>

        {linkedProfile ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultado del escaneo</Text>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={24} color="#7D1522" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{linkedProfile.name}</Text>
                <Text style={styles.profileEmail}>{linkedProfile.email || 'Sin email'}</Text>
              </View>
            </View>

            <View style={styles.profileActions}>
              <TouchableOpacity
                style={[styles.profileButton, styles.profileButtonSecondary]}
                onPress={openChatWithProfile}
                disabled={openingChat}
              >
                {openingChat ? (
                  <ActivityIndicator size="small" color="#7D1522" />
                ) : (
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#7D1522" />
                )}
                <Text style={styles.profileButtonSecondaryText}>Abrir chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileButton, styles.profileButtonPrimary]}
                onPress={startCallWithProfile}
                disabled={openingCall}
              >
                {openingCall ? (
                  <ActivityIndicator size="small" color="#FAFFFF" />
                ) : (
                  <Ionicons name="call-outline" size={18} color="#FAFFFF" />
                )}
                <Text style={styles.profileButtonPrimaryText}>Llamar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 28,
  },
  hero: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#7D1522',
  },
  kicker: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 28,
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 14,
  },
  cardTitle: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 18,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF7F8',
    borderWidth: 1,
    borderColor: '#E8D4D8',
    padding: 18,
    minHeight: 260,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  fallbackText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
  },
  helperText: {
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#7D1522',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
    borderWidth: 1,
    borderColor: '#E6D7DA',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 16,
  },
  profileEmail: {
    marginTop: 2,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
  },
  profileButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  profileButtonSecondary: {
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
  },
  profileButtonSecondaryText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  profileButtonPrimary: {
    backgroundColor: '#7D1522',
  },
  profileButtonPrimaryText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
});
