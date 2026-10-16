import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '../../components/AppModal';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import PasswordStrength from '../../components/PasswordStrength';
import { AuthContext } from '../../context/AuthContext';

export default function ResetPasswordScreen() {
  const { resetPassword, resendPasswordResetOtp } = useContext(AuthContext);
  const params = useLocalSearchParams<{ email?: string; expiresAt?: string; resendAvailableAt?: string }>();
  const initialEmail = useMemo(() => (typeof params.email === 'string' ? params.email : ''), [params.email]);
  const initialExpiresAt = useMemo(() => (typeof params.expiresAt === 'string' ? params.expiresAt : ''), [params.expiresAt]);
  const initialResendAvailableAt = useMemo(() => (typeof params.resendAvailableAt === 'string' ? params.resendAvailableAt : ''), [params.resendAvailableAt]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [resendAvailableAt, setResendAvailableAt] = useState(initialResendAvailableAt);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [modal, setModal] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
      setResendSecondsLeft(Math.max(0, Math.ceil((new Date(resendAvailableAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, resendAvailableAt]);

  const handleReset = async () => {
    try {
      setLoading(true);
      if (newPassword !== passwordConfirmation) {
        setModal({ title: 'Revisá las contraseñas', message: 'Las contraseñas no coinciden.' });
        return;
      }

      const result = await resetPassword(email.trim(), otp.trim(), newPassword, passwordConfirmation);

      if (result?.token) {
        router.replace('/(tabs)');
        return;
      }

      setModal({
        title: 'Contraseña actualizada',
        message: 'Ahora podés ingresar de nuevo.',
        onClose: () => router.replace('/auth/login'),
      });
    } catch (error: any) {
      setModal({ title: 'No pudimos cambiar la contraseña', message: error.response?.data?.error || 'Revisá los datos e intentá otra vez.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      const result = await resendPasswordResetOtp(email.trim());
      setExpiresAt(result?.expiresAt || '');
      setResendAvailableAt(result?.nextAllowedAt || new Date(Date.now() + 60000).toISOString());
      setModal({ title: 'Código reenviado', message: 'Revisá tu correo. El código anterior dejó de ser válido.' });
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
        <Text style={styles.title}>Nueva contraseña</Text>
        <Text style={styles.subtitle}>Ingresá el código que recibiste y definí una nueva contraseña.</Text>
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
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Nueva contraseña"
            placeholderTextColor="#6B6265"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.passwordVisibilityButton}
            onPress={() => setShowPassword((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#777" />
          </TouchableOpacity>
        </View>
        <PasswordStrength password={newPassword} />
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Repetir nueva contraseña"
            placeholderTextColor="#6B6265"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.passwordVisibilityButton} onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#777" />
          </TouchableOpacity>
        </View>
        {passwordConfirmation.length > 0 && newPassword !== passwordConfirmation ? <Text style={styles.validationText}>Las contraseñas no coinciden.</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="lock-open-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Cambiar contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resendLoading || resendSecondsLeft > 0}>
          {resendLoading ? <ActivityIndicator color="#B5222A" /> : <Text style={[styles.secondaryButtonText, resendSecondsLeft > 0 && styles.disabledText]}>{resendSecondsLeft > 0 ? `Reenviar código en ${resendSecondsLeft}s` : 'Reenviar código'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
      </View>
      </KeyboardAwareScreen>
      <AppModal
        visible={!!modal}
        title={modal?.title || ''}
        message={modal?.message}
        onClose={() => {
          const onClose = modal?.onClose;
          setModal(null);
          onClose?.();
        }}
      />
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
  passwordInputWrapper: {
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree',
  },
  passwordVisibilityButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  disabledText: { color: '#999' },
  validationText: { color: '#B5222A', fontSize: 12, fontFamily: 'BaiJamjuree' },
  expiryText: { color: '#6A6A6A', fontSize: 12, fontFamily: 'BaiJamjuree' },
});
