import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

type ProfileCard = {
  id: string;
  name: string;
  email?: string | null;
  qrCode?: string | null;
};

function extractQrCode(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return code.trim();
  } catch {
    // The QR may contain the raw code instead of a URL.
  }

  return trimmed;
}

export default function QrScreen() {
  const { user, refreshUser } = useContext(AuthContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [openingCall, setOpeningCall] = useState(false);
  const [linkedProfile, setLinkedProfile] = useState<ProfileCard | null>(null);
  const scanLockRef = useRef(false);

  const qrImageSource = useMemo(() => {
    if (!user?.qrDataUrl) return null;
    return { uri: user.qrDataUrl };
  }, [user?.qrDataUrl]);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara para escanear un QR.');
        return;
      }
    }

    setScannerOpen(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning || scanLockRef.current) return;
    scanLockRef.current = true;

    const code = extractQrCode(data);
    if (!code) {
      scanLockRef.current = false;
      Alert.alert('QR invalido', 'No pudimos leer el codigo del QR.');
      return;
    }

    try {
      setScanning(true);
      const response = await api.post('/auth/join-host-by-qr', { code });
      const host = response.data?.host;

      if (host?.id) {
        setLinkedProfile({
          id: host.id,
          name: host.name,
          email: host.email || null,
          qrCode: host.qrCode || null,
        });
      }

      await refreshUser();
      setScannerOpen(false);
      Alert.alert('Vinculacion completa', response.data?.message || 'Te vinculaste correctamente.');
    } catch (error: any) {
      console.error('Error vinculando QR:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo vincular el QR.');
    } finally {
      setScanning(false);
      scanLockRef.current = false;
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>QR</Text>
        <Text style={styles.title}>Tu codigo y escaner</Text>
        <Text style={styles.subtitle}>
          Muestra tu QR para que te vinculen y escanea el QR de otro usuario para conectarte.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mi QR</Text>
        <View style={styles.qrBox}>
          {qrImageSource ? (
            <Image source={qrImageSource} style={styles.qrImage} resizeMode="contain" />
          ) : (
            <View style={styles.qrFallback}>
              <Ionicons name="qr-code-outline" size={52} color="#7D1522" />
              <Text style={styles.fallbackText}>No hay QR disponible</Text>
            </View>
          )}
        </View>
        <Text style={styles.helperText}>
          {user?.qrCode ? 'Este es el codigo de tu cuenta.' : 'Inicia sesion nuevamente si el QR no aparece.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Escanear otro QR</Text>
        <Text style={styles.helperText}>
          Abre la camara, lee el QR de otro usuario y vincularlo a tu cuenta.
        </Text>

        {!scannerOpen ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenScanner}>
            <Ionicons name="scan" size={18} color="#FAFFFF" />
            <Text style={styles.primaryButtonText}>Abrir escaner</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.scannerShell}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Apunta al QR</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setScannerOpen(false)}
                disabled={scanning}
              >
                <Text style={styles.secondaryButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scannerFrame}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerCornerTopLeft} />
                <View style={styles.scannerCornerTopRight} />
                <View style={styles.scannerCornerBottomLeft} />
                <View style={styles.scannerCornerBottomRight} />
              </View>
            </View>

            {scanning ? (
              <View style={styles.scanningRow}>
                <ActivityIndicator size="small" color="#7D1522" />
                <Text style={styles.scanningText}>Procesando QR...</Text>
              </View>
            ) : null}
          </View>
        )}
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acceso rapido</Text>
        <TouchableOpacity style={styles.secondaryAction} onPress={handleOpenScanner}>
          <Ionicons name="scan-outline" size={18} color="#7D1522" />
          <Text style={styles.secondaryActionText}>Reabrir escaner</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  content: {
    padding: 20,
    gap: 16,
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
  scannerShell: {
    gap: 14,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scannerTitle: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
  },
  secondaryButtonText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 13,
  },
  scannerFrame: {
    aspectRatio: 0.85,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCornerTopLeft: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FAFFFF',
    borderTopLeftRadius: 10,
  },
  scannerCornerTopRight: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 42,
    height: 42,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FAFFFF',
    borderTopRightRadius: 10,
  },
  scannerCornerBottomLeft: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    width: 42,
    height: 42,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FAFFFF',
    borderBottomLeftRadius: 10,
  },
  scannerCornerBottomRight: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 42,
    height: 42,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FAFFFF',
    borderBottomRightRadius: 10,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanningText: {
    color: '#666',
    fontFamily: 'BaiJamjuree',
  },
  secondaryAction: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryActionText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 15,
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
