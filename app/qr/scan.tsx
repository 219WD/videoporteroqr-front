import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';

const CheckIcon = () => (
  <View style={styles.checkIcon}>
    <Text style={styles.checkIconText}>✓</Text>
  </View>
);

export default function ScanQR() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <Image
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.message}>Necesitamos permisos para usar la cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Dar permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const extractQrCode = (data: string) => {
    try {
      const url = new URL(data);
      const urlParams = new URLSearchParams(url.search);
      return urlParams.get('code') || data;
    } catch {
      return data;
    }
  };

  const handleLoggedInScan = async (qrCode: string) => {
    try {
      const hostResponse = await api.get(`/auth/host-by-qr/${encodeURIComponent(qrCode)}`);
      const hostId = hostResponse.data?.host?.id || null;
      const hostName = hostResponse.data?.host?.name || 'el host';

      if (hostId && user?.id && String(hostId) === String(user.id)) {
        Alert.alert(
          'QR no válido',
          'Ese QR es el de tu propia cuenta. Escaneá el QR de la otra persona para vincularte.',
        );
        setScanning(true);
        setProcessing(false);
        return;
      }

      const response = await api.post('/auth/join-host-by-qr', { code: qrCode });
      const alreadyLinked = !!response.data?.alreadyLinked;

      Alert.alert(
        'Vinculación exitosa',
        alreadyLinked
          ? `Ya estabas vinculado con ${hostName}.`
          : `Tu cuenta quedó vinculada con ${hostName}.`,
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/dashboard/host'),
          },
        ],
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al vincularte con el host';
      Alert.alert('Error', errorMessage);
      setScanning(true);
      setProcessing(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing) return;

    setScanning(false);
    setProcessing(true);

    try {
      const qrCode = extractQrCode(data);

      if (!qrCode) {
        Alert.alert('Error', 'QR no válido');
        setScanning(true);
        setProcessing(false);
        return;
      }

      setScannedCode(qrCode);
      console.log('QR escaneado:', qrCode);

      if (user) {
        await handleLoggedInScan(qrCode);
        return;
      }

      setProcessing(false);
    } catch (error) {
      console.error('Error procesando QR:', error);
      Alert.alert('Error', 'Error al procesar el código QR');
      setScanning(true);
      setProcessing(false);
    }
  };

  const handleRegister = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleScanAgain = () => {
    setScanning(true);
    setScannedCode('');
    setProcessing(false);
  };

  if (processing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <Image
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#7D1522" />
        <Text style={[styles.message, { marginTop: 20 }]}>
          {user ? 'Vinculando tu cuenta...' : 'Procesando...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!scanning && scannedCode && !user) {
    return (
      <SafeAreaView style={styles.resultContainer} edges={['top', 'left', 'right', 'bottom']}>
        <Image
          source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.successHeader}>
          <CheckIcon />
          <Text style={styles.title}>QR Escaneado</Text>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>Código: {scannedCode}</Text>
        </View>
        <Text style={styles.message}>
          Iniciá sesión para asociar este QR con tu cuenta.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Crear cuenta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
            <Text style={styles.secondaryButtonText}>Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={handleScanAgain}>
            <Text style={styles.outlineButtonText}>Escanear otro código</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.overlay}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Image
            source={{ uri: 'https://res.cloudinary.com/dtxdv136u/image/upload/v1763499836/logo_alb_ged07k.png' }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.overlayText}>
            {user ? 'Escaneá el QR del anfitrión para vincular tu cuenta' : 'Escaneá el código QR para continuar'}
          </Text>
        </View>
        <View style={styles.scanFrame} />
        <Text style={styles.instructions}>Encuadrá el código QR dentro del marco</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAFFFF',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#3D3D3D',
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
    lineHeight: 22,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    width: '100%',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'BaiJamjuree-Bold',
    paddingHorizontal: 20,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#7D1522',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FAFFFF',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  checkIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  checkIconText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'BaiJamjuree-Bold',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  codeContainer: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    width: '100%',
  },
  codeText: {
    fontSize: 16,
    color: '#3D3D3D',
    textAlign: 'center',
    fontFamily: 'BaiJamjuree',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: '#7D1522',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FAFFFF',
    fontSize: 16,
    fontFamily: 'BaiJamjuree-Bold',
  },
  secondaryButton: {
    backgroundColor: '#3D3D3D',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FAFFFF',
    fontSize: 16,
    fontFamily: 'BaiJamjuree-Bold',
  },
  outlineButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    minHeight: 50,
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#3D3D3D',
    fontSize: 16,
    fontFamily: 'BaiJamjuree',
  },
});
