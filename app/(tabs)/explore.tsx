import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorar</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bienvenido a QR Door</Text>
        <Text style={styles.text}>
          Esta aplicación te permite gestionar accesos mediante códigos QR.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Funcionalidades</Text>
        <Text style={styles.feature}>• Escanear códigos QR</Text>
        <Text style={styles.feature}>• Gestionar invitados</Text>
        <Text style={styles.feature}>• Llamadas por video</Text>
        <Text style={styles.feature}>• Notificaciones en tiempo real</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cómo usar</Text>
        <Text style={styles.text}>
          1. Regístrate como host o invitado{"\n"}
          2. Genera o escanea QR codes{"\n"}
          3. Gestiona tus contactos{"\n"}
          4. Responde llamadas de timbre
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  header: {
    padding: 20,
    backgroundColor: '#7D1522',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'BaiJamjuree-Bold',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    lineHeight: 22,
  },
  feature: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'BaiJamjuree',
    marginBottom: 5,
    lineHeight: 22,
  },
});