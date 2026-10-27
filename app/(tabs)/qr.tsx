import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import AppView from '../../components/AppView';
import { QrManagementCard } from '../../components/qr/QrManagementCard';
import { useQrPage } from '../../hooks/useQrPage';

export default function QrScreen() {
  const qr = useQrPage();
  const params = useLocalSearchParams<{ openRequest?: string }>();

  return (
    <AppView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Ionicons name="qr-code" size={30} color="#d32f2f" />
        <Text style={styles.title}>Mi placa Portero QR</Text>
        <Text style={styles.subtitle}>Solicitá tu placa y revisá cómo se verá antes de recibirla.</Text>
        <QrManagementCard {...qr} onReload={qr.reload} initialRequestOpen={params.openRequest === '1'} />
      </ScrollView>
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  title: { marginTop: 8, color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 26 },
  subtitle: { marginTop: 4, marginBottom: 18, color: '#666', fontFamily: 'BaiJamjuree', fontSize: 14 },
});
