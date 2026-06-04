import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppView from '../../components/AppView';
import { AuthContext } from '../../context/AuthContext';
import { createLogger } from '../../utils/logger';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const log = createLogger('profile');

  const handleLogout = () => {
    Alert.alert('Cerrar sesion', 'Quieres salir de tu cuenta ahora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/auth/login');
          } catch (error) {
            log.error('error cerrando sesion:', error);
          }
        },
      },
    ]);
  };

  return (
    <AppView style={styles.container}>
      <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color="#d32f2f" />
          </View>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#d32f2f" />
          <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </View>
    </AppView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
    gap: 10,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
  },
  label: {
    color: '#666',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  name: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#d32f2f',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
});
