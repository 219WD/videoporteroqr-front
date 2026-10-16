import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '../../components/AppModal';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import { AuthContext } from '../../context/AuthContext';

export default function VerifyEmailScreen() {
  const { verifyEmail, resendEmailOtp } = useContext(AuthContext);
  const params = useLocalSearchParams<{ email?: string; expiresAt?: string; resendAvailableAt?: string }>();
  const initialEmail = useMemo(() => (typeof params.email === 'string' ? params.email : ''), [params.email]);
  const initialExpiresAt = useMemo(() => (typeof params.expiresAt === 'string' ? params.expiresAt : ''), [params.expiresAt]);
  const initialResendAvailableAt = useMemo(() => (typeof params.resendAvailableAt === 'string' ? params.resendAvailableAt : ''), [params.resendAvailableAt]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [resendAvailableAt, setResendAvailableAt] = useState(initialResendAvailableAt);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextExpiry = new Date(expiresAt).getTime();
      const nextResend = new Date(resendAvailableAt).getTime();
      setSecondsLeft(Number.isFinite(nextExpiry) ? Math.max(0, Math.ceil((nextExpiry - Date.now()) / 1000)) : 0);
      setResendSecondsLeft(Number.isFinite(nextResend) ? Math.max(0, Math.ceil((nextResend - Date.now()) / 1000)) : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, resendAvailableAt]);

  const handleVerify = async () => {
    try {
      setLoading(true);
      const result = await verifyEmail(email.trim(), otp.trim());

      if (result?.token) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setModal({ title: 'No pudimos verificar el correo', message: error.response?.data?.error || 'Revisá el código e intentá otra vez.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      const result = await resendEmailOtp(email.trim());
      setExpiresAt(result?.expiresAt || '');
      setResendAvailableAt(result?.nextAllowedAt || new Date(Date.now() + 60000).toISOString());
      setModal({ title: 'Código enviado', message: 'Revisá tu correo. El código anterior dejó de ser válido.' });
    } catch (error: any) {
      const apiError = error.response?.data;
      setModal({ title: 'No pudimos reenviar el código', message: apiError?.error || 'Intentá de nuevo en unos momentos.' });
      if (apiError?.nextAllowedAt) setResendAvailableAt(apiError.nextAllowedAt);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Verificar correo</Text>
        <Text style={styles.subtitle}>Ingresá el código de 6 dígitos que enviamos a tu correo.</Text>
        {secondsLeft > 0 ? <Text style={styles.expiryText}>El código vence en {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}.</Text> : null}
        {expiresAt && secondsLeft === 0 ? <Text style={styles.expiryText}>El código venció. Pedí uno nuevo.</Text> : null}

        <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B6265"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Código de 6 dígitos"
          placeholderTextColor="#6B6265"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="shield-checkmark-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Verificar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resendLoading || resendSecondsLeft > 0}>
          {resendLoading ? <ActivityIndicator color="#B5222A" /> : <Text style={[styles.secondaryButtonText, resendSecondsLeft > 0 && styles.disabledText]}>{resendSecondsLeft > 0 ? `Reenviar código en ${resendSecondsLeft}s` : 'Reenviar código'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.linkButtonText}>Volver al ingreso</Text>
        </TouchableOpacity>
      </View>
      </View>
      </KeyboardAwareScreen>
      <AppModal visible={!!modal} title={modal?.title || ''} message={modal?.message} onClose={() => setModal(null)} />
    </>
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
    color: '#5F5759',
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
    color: '#B5222A',
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
  disabledText: { color: '#999' },
  expiryText: { color: '#6A6A6A', fontSize: 12, fontFamily: 'BaiJamjuree' },
});
