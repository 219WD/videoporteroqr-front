import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import { AuthContext } from '../../context/AuthContext';

export default function VerifyEmailScreen() {
  const { verifyEmail, resendEmailOtp } = useContext(AuthContext);
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => (typeof params.email === 'string' ? params.email : ''), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      const result = await verifyEmail(email.trim(), otp.trim());

      if (result?.token) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('No pudimos verificar el correo', error.response?.data?.error || 'Revisa el codigo e intenta otra vez.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      await resendEmailOtp(email.trim());
      Alert.alert('Codigo enviado', 'Revisa tu correo para ver el nuevo codigo.');
    } catch (error: any) {
      Alert.alert('No pudimos reenviar el codigo', error.response?.data?.error || 'Intenta de nuevo en unos momentos.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Verificar correo</Text>
        <Text style={styles.subtitle}>Ingresa el codigo de 6 digitos que enviamos a tu correo.</Text>

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

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Verificar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resendLoading}>
          {resendLoading ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.secondaryButtonText}>Reenviar codigo</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.linkButtonText}>Volver al ingreso</Text>
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
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  linkButtonText: {
    color: '#6A6A6A',
    fontFamily: 'BaiJamjuree',
  },
});
