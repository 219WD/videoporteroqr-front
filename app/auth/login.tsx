import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '../../components/AppModal';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(email.trim(), password, rememberMe);
      router.replace('/(tabs)');
    } catch (error: any) {
      const apiError = error.response?.data;

      if (apiError?.code === 'EMAIL_NOT_VERIFIED' || apiError?.requiresEmailVerification) {
        router.push({
          pathname: '/auth/verify-email',
          params: {
            email: email.trim(),
            expiresAt: apiError.emailVerificationExpiresAt || undefined,
            resendAvailableAt: apiError.emailVerificationResendAvailableAt || undefined,
          },
        });
        return;
      }

      setModal({ title: 'No pudimos iniciar sesión', message: apiError?.error || 'Revisá tus datos e intentá otra vez.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Ingresar</Text>
        <Text style={styles.subtitle}>Ingresá con tu cuenta para continuar.</Text>

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
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor="#6B6265"
            value={password}
            onChangeText={setPassword}
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

        <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }}>
          <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={21} color={rememberMe ? '#B5222A' : '#777'} />
          <Text style={styles.rememberText}>Recordarme en este dispositivo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="log-in-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Ingresar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/register')}>
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/auth/forgot-password')}>
          <Text style={styles.linkButtonText}>Olvidé mi contraseña</Text>
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
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  linkButtonText: {
    color: '#5F5759',
    fontFamily: 'BaiJamjuree',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  rememberText: {
    color: '#5F5759',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
});
