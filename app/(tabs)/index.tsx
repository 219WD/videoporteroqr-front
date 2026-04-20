import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';

type QuickActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
};

function QuickAction({ icon, label, onPress, accent }: QuickActionProps) {
  return (
    <TouchableOpacity style={[styles.quickAction, accent && styles.quickActionAccent]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={accent ? '#FAFFFF' : '#7D1522'} />
      <Text style={[styles.quickActionText, accent && styles.quickActionTextAccent]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Inicio</Text>
        <Text style={styles.title}>Panel principal</Text>
        <Text style={styles.subtitle}>
          {user?.name ? `Hola ${user.name}, desde aquí gestionás tu cuenta y tus contactos.` : 'Gestioná tu cuenta desde un solo lugar.'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accesos rápidos</Text>
        <View style={styles.grid}>
          <QuickAction icon="people-outline" label="Contactos" onPress={() => router.push('/contacts')} />
          <QuickAction icon="time-outline" label="Historial" onPress={() => router.push('/history')} />
          <QuickAction icon="chatbubble-ellipses-outline" label="Mensajes" onPress={() => router.push('/messages')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu cuenta</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Nombre</Text>
            <Text style={styles.summaryValue}>{user?.name || 'Sin usuario'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rol</Text>
            <Text style={styles.summaryValue}>{user?.role === 'admin' ? 'Administrador' : 'Anfitrión'}</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '48%',
    minHeight: 96,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F7F2F3',
    justifyContent: 'space-between',
  },
  quickActionAccent: {
    backgroundColor: '#7D1522',
    borderColor: '#7D1522',
  },
  quickActionText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  quickActionTextAccent: {
    color: '#FAFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  summaryLabel: {
    color: '#777',
    fontFamily: 'BaiJamjuree',
    fontSize: 12,
  },
  summaryValue: {
    marginTop: 6,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 15,
  },
});
