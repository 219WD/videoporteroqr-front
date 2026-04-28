import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

function extractQrCode(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    if (code) return code.trim();

    const pathSegments = url.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment) return decodeURIComponent(lastSegment.trim());
  } catch {
    // The QR may contain the raw code instead of a URL.
  }

  return trimmed;
}

export default function QrScanScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loadingPermission, setLoadingPermission] = useState(false);
  const scanLockRef = useRef(false);
  const scanProgress = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();

  const scannerFrameHeight = useMemo(() => {
    return Math.max(340, Math.min(Math.round(height * 0.58), 520));
  }, [height]);

  const scanLineY = useMemo(() => {
    return scanProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [24, scannerFrameHeight - 24],
    });
  }, [scanProgress, scannerFrameHeight]);

  useEffect(() => {
    if (!permission) {
      setLoadingPermission(true);
      requestPermission()
        .catch((error) => {
          console.error('Error requesting camera permission:', error);
        })
        .finally(() => {
          setLoadingPermission(false);
        });
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanProgress, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [scanProgress]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning || scanLockRef.current) return;
    scanLockRef.current = true;

    const code = extractQrCode(data);
    if (!code) {
      scanLockRef.current = false;
      Alert.alert('QR inválido', 'No pudimos leer el código del QR.');
      return;
    }

    try {
      setScanning(true);

      const response = await api.post('/flows/start', {
        qrCode: code,
        actionType: 'message',
        guestName: user?.name || 'Visitante',
        guestFullName: user?.name || 'Visitante',
        isAnonymous: true,
      });

      const conversationId = response.data?.callId;
      const guestToken = response.data?.guestToken;

      if (!conversationId || !guestToken) {
        throw new Error('No se pudo abrir el chat');
      }

      await AsyncStorage.setItem('guestToken', String(guestToken));

      router.replace({
        pathname: `/flows/${encodeURIComponent(String(conversationId))}`,
        params: {
          role: 'guest',
          guestToken: String(guestToken),
        },
      });
    } catch (error: any) {
      console.error('Error iniciando chat anónimo desde QR:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo iniciar el chat anónimo.');
    } finally {
      setScanning(false);
      scanLockRef.current = false;
    }
  };

  const openSettingsHint = () => {
    Alert.alert('Permiso de cámara', 'Activa el permiso de cámara para poder escanear un QR.');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <StatusBar style="light" backgroundColor="#0B0B0D" translucent={false} />

      <View style={styles.backgroundGlow} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#FAFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Scanner</Text>
          <Text style={styles.title}>Apuntá al QR</Text>
        </View>
      </View>

      <View style={styles.body}>
        {permission?.granted ? (
          <View style={[styles.scannerFrame, { height: scannerFrameHeight }]}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            <View style={styles.darkOverlay} pointerEvents="none" />

            <View style={styles.frameOutline} pointerEvents="none">
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.scanLine,
                  {
                    transform: [{ translateY: scanLineY }],
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.permissionCard}>
            <View style={styles.permissionIcon}>
              <Ionicons name="camera-outline" size={28} color="#FAFFFF" />
            </View>
            <Text style={styles.permissionTitle}>Necesitamos la cámara</Text>
            <Text style={styles.permissionText}>
              El scanner usa la cámara para leer el QR y abrir el chat anónimo.
            </Text>

            <TouchableOpacity
              style={styles.permissionButton}
              onPress={async () => {
                try {
                  setLoadingPermission(true);
                  await requestPermission();
                } finally {
                  setLoadingPermission(false);
                }
              }}
            >
              {loadingPermission ? (
                <ActivityIndicator size="small" color="#FAFFFF" />
              ) : (
                <Text style={styles.permissionButtonText}>Permitir cámara</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.permissionSecondaryButton} onPress={openSettingsHint}>
              <Text style={styles.permissionSecondaryText}>Ya lo permití</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Text style={styles.footerText}>
          En cuanto detecte un QR válido, vas a entrar directo al chat anónimo.
        </Text>
        {scanning ? (
          <View style={styles.scanningRow}>
            <ActivityIndicator size="small" color="#FF5B6E" />
            <Text style={styles.scanningText}>Procesando QR...</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0D',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(125, 21, 34, 0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 14,
    zIndex: 2,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  scannerFrame: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  frameOutline: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 48,
    height: 48,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FAFFFF',
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FAFFFF',
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    width: 48,
    height: 48,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FAFFFF',
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 48,
    height: 48,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FAFFFF',
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FF324B',
    shadowColor: '#FF324B',
    shadowOpacity: 0.65,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  permissionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  permissionIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  permissionTitle: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 18,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'BaiJamjuree',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#7D1522',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  permissionButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  permissionSecondaryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  permissionSecondaryText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  footerText: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanningText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 13,
  },
});
