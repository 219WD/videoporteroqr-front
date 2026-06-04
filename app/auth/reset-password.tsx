import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import { AuthContext } from '../../context/AuthContext';

export default function ResetPasswordScreen() {
  const { resetPassword } = useContext(AuthContext);
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => (typeof params.email === 'string' ? params.email : ''), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      const result = await resetPassword(email.trim(), otp.trim(), newPassword);

      if (result?.token) {
        router.replace('/(tabs)');
        return;
      }

      Alert.alert('Contrasena actualizada', 'Ahora podes ingresar de nuevo.');
      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert('No pudimos cambiar la contrasena', error.response?.data?.error || 'Revisa los datos e intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Nueva contrasena</Text>
        <Text style={styles.subtitle}>Ingresa el codigo que recibiste y define una nueva contrasena.</Text>

        <View style={styles.form}>
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
          placeholder="Codigo de 6 digitos"
          placeholderTextColor="#999"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TextInput
          style={styles.input}
          placeholder="Nueva contrasena"
          placeholderTextColor="#999"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="lock-open-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Cambiar contrasena</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
      </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
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
    backgroundColor: '#d32f2f',
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
    color: '#d32f2f',
    fontFamily: 'BaiJamjuree-Bold',
  },
});
