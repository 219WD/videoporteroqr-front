import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '../../components/AppModal';
import KeyboardAwareScreen from '../../components/KeyboardAwareScreen';
import PasswordStrength from '../../components/PasswordStrength';
import { AuthContext } from '../../context/AuthContext';

export default function RegisterScreen() {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  const handleRegister = async () => {
    if (password !== passwordConfirmation) {
      setModal({ title: 'Revisá las contraseñas', message: 'Las contraseñas no coinciden.' });
      return;
    }

    try {
      setLoading(true);
      const result = await register(name.trim(), email.trim(), password, passwordConfirmation, 'host');

      if (result?.requiresEmailVerification) {
        router.replace({
          pathname: '/auth/verify-email',
          params: {
            email: result.email || email.trim(),
            expiresAt: result.emailVerificationExpiresAt || undefined,
            resendAvailableAt: result.emailVerificationResendAvailableAt || undefined,
          },
        });
        return;
      }

      if (result?.token) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setModal({ title: 'No pudimos crear la cuenta', message: error.response?.data?.error || 'Revisá los datos e intentá otra vez.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAwareScreen contentStyle={styles.content}>
      <View style={styles.container}>
        <Text style={styles.title}>Registrarse</Text>
        <Text style={styles.subtitle}>Creá tu cuenta para empezar a usar la app.</Text>

        <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#6B6265"
          value={name}
          onChangeText={setName}
        />
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
        <PasswordStrength password={password} />
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Repetir contraseña"
            placeholderTextColor="#6B6265"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
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
        {passwordConfirmation.length > 0 && password !== passwordConfirmation ? (
          <Text style={styles.validationText}>Las contraseñas no coinciden.</Text>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFFFF" /> : <Ionicons name="person-add-outline" size={18} color="#FAFFFF" />}
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/login')}>
          <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
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
  validationText: {
    color: '#B5222A',
    fontSize: 12,
    fontFamily: 'BaiJamjuree',
  },
});
