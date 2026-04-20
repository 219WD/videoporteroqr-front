import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function ScanScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    try {
      // we expect a url like https://.../scan?code=xxxx
      const url = new URL(data);
      const code = url.searchParams.get('code');
      if (!code) {
        alert('QR no válido');
        return;
      }
      navigation.navigate('RegisterGuest', { code });
    } catch (e) {
      alert('QR no válido');
    }
  };

  if (hasPermission === null) return <Text>Solicitando permiso de cámara</Text>;
  if (hasPermission === false) return <Text>Sin acceso a la cámara</Text>;

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        style={{ flex: 1 }}
      />
    </View>
  );
}
