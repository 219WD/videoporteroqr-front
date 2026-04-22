import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      await register(name.trim(), email.trim(), password, 'host');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <Text style={styles.title}>Registrarse</Text>
      <Text style={styles.subtitle}>Creá tu cuenta para empezar a usar la app.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="person-add-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 20,
  },
  form: {
    marginTop: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#7D1522',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FAFFFF',
    fontFamily: 'BaiJamjuree-Bold',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#7D1522',
    fontFamily: 'BaiJamjuree-Bold',
  },
});
