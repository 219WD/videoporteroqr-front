import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import { AuthContext } from '../../context/AuthContext';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);
      await forgotPassword(email.trim());
      router.push({
        pathname: '/auth/reset-password',
        params: { email: email.trim() },
      });
    } catch (error: any) {
      Alert.alert('No pudimos iniciar la recuperacion', error.response?.data?.error || 'Revisa el correo e intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Recuperar contrasena</Text>
        <Text style={styles.subtitle}>Te enviaremos un codigo por correo para crear una nueva contrasena.</Text>

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

        <TouchableOpacity style={styles.primaryButton} onPress={handleSend} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="mail-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Enviar codigo</Text>
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
