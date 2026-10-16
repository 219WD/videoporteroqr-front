import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  password: string;
};

export default function PasswordStrength({ password }: Props) {
  const result = useMemo(() => {
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z\d]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    const labels = ['', 'Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];
    const colors = ['#D8D8D8', '#C62828', '#E67E22', '#D4A017', '#2E7D32', '#1B5E20'];

    return { checks, score, label: labels[score], color: colors[score] };
  }, [password]);

  if (!password) return null;

  return (
    <View style={styles.container} accessibilityLabel={`Seguridad de la contraseña: ${result.label}`}>
      <View style={styles.header}>
        <Text style={styles.caption}>Seguridad de la contraseña</Text>
        <Text style={[styles.label, { color: result.color }]}>{result.label}</Text>
      </View>
      <View style={styles.bars}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View key={index} style={[styles.bar, { backgroundColor: index < result.score ? result.color : '#E5E5E5' }]} />
        ))}
      </View>
      <Text style={styles.hint}>
        Usá al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingHorizontal: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: '#6A6A6A', fontSize: 12, fontFamily: 'BaiJamjuree' },
  label: { fontSize: 12, fontFamily: 'BaiJamjuree-Bold' },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  hint: { color: '#777', fontSize: 11, lineHeight: 15, fontFamily: 'BaiJamjuree' },
});
