import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppView from '../../components/AppView';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function QrScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
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

  return (
    <AppView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>QR</Text>
          <Text style={styles.title}>Tu código QR</Text>
          <Text style={styles.subtitle}>
            Muestra este QR para recibir mensajes anónimos o escaneá el QR de otra persona para abrir un chat.
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
              ? 'Este es el código de tu cuenta.'
              : 'Inicia sesión nuevamente si el QR no aparece.'}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={loadQr} disabled={qrLoading}>
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
            Abrí el scanner para iniciar un chat anónimo con la persona dueña de ese QR.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/qr-scan')}>
            <Ionicons name="scan" size={18} color="#FAFFFF" />
            <Text style={styles.primaryButtonText}>Abrir scanner</Text>
          </TouchableOpacity>
        </View>
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
});
