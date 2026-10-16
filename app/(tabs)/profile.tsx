import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppView from '../../components/AppView';
import AppModal from '../../components/AppModal';
import { AuthContext } from '../../context/AuthContext';
import { createLogger } from '../../utils/logger';
import { DEFAULT_VISITOR_SCHEDULE, VisitorSchedule, useQrPage } from '../../hooks/useQrPage';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);
  const params = useLocalSearchParams<{ setup?: string }>();
  const insets = useSafeAreaInsets();
  const log = createLogger('profile');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { visitorDisplayName, visitorWelcomeMessage, visitorStatus, visitorSchedule, visitorSettingsConfigured, plateInstalledAt, saveVisitorSettings, actionError } = useQrPage();
  const [displayNameDraft, setDisplayNameDraft] = useState(user?.name || '');
  const [welcomeDraft, setWelcomeDraft] = useState(visitorWelcomeMessage);
  const [scheduleDraft, setScheduleDraft] = useState<VisitorSchedule>(DEFAULT_VISITOR_SCHEDULE);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  useEffect(() => {
    setDisplayNameDraft(visitorDisplayName || user?.name || '');
  }, [user?.name, visitorDisplayName]);

  useEffect(() => {
    setWelcomeDraft(visitorWelcomeMessage);
  }, [visitorWelcomeMessage]);

  useEffect(() => {
    setScheduleDraft(visitorSchedule);
  }, [visitorSchedule]);

  useEffect(() => {
    if (params.setup === '1') setTutorialStep(0);
  }, [params.setup]);

  const saveSettings = async (nextStatus = visitorStatus, nextSchedule = scheduleDraft, configurationComplete = visitorSettingsConfigured) => {
    if (!welcomeDraft.trim() || savingSettings) return;
    setSavingSettings(true);
    try {
      await saveVisitorSettings(welcomeDraft, nextStatus, nextSchedule, displayNameDraft.trim() || user?.name || 'Mi timbre', configurationComplete);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      log.error('error cerrando sesion:', error);
    }
  };

  return (
    <>
      <AppView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color="#d32f2f" />
          </View>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.name}>{user?.name || 'Usuario'}</Text>
          {plateInstalledAt ? <Text style={styles.installationDate}>Placa instalada el {new Date(plateInstalledAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text> : null}
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Configuración del visitante</Text>
          <Text style={styles.sectionText}>Personalizá el mensaje y el estado que verá alguien al escanear tu QR.</Text>
          {!visitorSettingsConfigured ? <View style={styles.pendingConfigCard}><Ionicons name="alert-circle-outline" size={20} color="#9A6B12" /><View style={styles.pendingConfigCopy}><Text style={styles.pendingConfigTitle}>Configuración pendiente</Text><Text style={styles.pendingConfigText}>Guardá el nombre, el mensaje y los horarios para dejar listo tu timbre.</Text></View></View> : null}
          <Text style={styles.fieldLabel}>Nombre que verá el visitante</Text>
          <Text style={styles.sectionText}>Podés usar tu nombre, el apellido de tu familia o cualquier nombre para el timbre.</Text>
          <TextInput
            value={displayNameDraft}
            onChangeText={setDisplayNameDraft}
            maxLength={80}
            placeholder="Ej.: Juan Pérez o Familia Pérez"
            placeholderTextColor="#999"
            style={styles.singleLineInput}
          />
          <View style={styles.quickChoices}>
            <TouchableOpacity style={styles.quickChoice} onPress={() => setDisplayNameDraft(user?.name || '')}><Text style={styles.quickChoiceText}>Usar mi nombre</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickChoice} onPress={() => setDisplayNameDraft(user?.name ? `Familia ${user.name.split(' ').slice(-1)[0]}` : 'Familia')}><Text style={styles.quickChoiceText}>Usar familia</Text></TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Mensaje de bienvenida</Text>
          <TextInput
            value={welcomeDraft}
            onChangeText={setWelcomeDraft}
            maxLength={240}
            multiline
            placeholder="Escribí tu mensaje de bienvenida"
            placeholderTextColor="#999"
            style={styles.settingsInput}
          />
          <View style={styles.statusChoices}>
            {(['available', 'off_hours', 'unavailable'] as const).map((option) => (
              <TouchableOpacity key={option} style={[styles.statusChoice, visitorStatus === option && styles.statusChoiceActive]} onPress={() => void saveSettings(option)} disabled={savingSettings}>
                <Text style={[styles.statusChoiceText, visitorStatus === option && styles.statusChoiceTextActive]}>{option === 'available' ? 'Disponible' : option === 'off_hours' ? 'Fuera de horario' : 'No disponible'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveSettingsButton} onPress={() => void saveSettings()} disabled={savingSettings || !welcomeDraft.trim()}>
            {savingSettings ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.saveSettingsText}>Guardar mensaje</Text>}
          </TouchableOpacity>
          <Text style={styles.scheduleTitle}>Horarios de atención</Text>
          <Text style={styles.sectionText}>Fuera de estos horarios el QR se mostrará como “Fuera de horario”.</Text>
          {scheduleDraft.map((item) => {
            const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][item.day];
            return (
              <View key={item.day} style={styles.scheduleRow}>
                <TouchableOpacity style={[styles.dayToggle, item.enabled && styles.dayToggleActive]} onPress={() => setScheduleDraft((current) => current.map((day) => day.day === item.day ? { ...day, enabled: !day.enabled } : day))}>
                  <Text style={[styles.dayText, item.enabled && styles.dayTextActive]}>{dayName}</Text>
                </TouchableOpacity>
                <TextInput value={item.start} onChangeText={(value) => setScheduleDraft((current) => current.map((day) => day.day === item.day ? { ...day, start: value } : day))} style={styles.timeInput} placeholder="09:00" placeholderTextColor="#999" keyboardType="numbers-and-punctuation" maxLength={5} />
                <Text style={styles.timeDash}>—</Text>
                <TextInput value={item.end} onChangeText={(value) => setScheduleDraft((current) => current.map((day) => day.day === item.day ? { ...day, end: value } : day))} style={styles.timeInput} placeholder="18:00" placeholderTextColor="#999" keyboardType="numbers-and-punctuation" maxLength={5} />
              </View>
            );
          })}
          <TouchableOpacity style={styles.saveSettingsButton} onPress={() => void saveSettings(visitorStatus, scheduleDraft, true)} disabled={savingSettings}>
            {savingSettings ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.saveSettingsText}>Guardar horarios</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewButton} onPress={() => setPreviewVisible(true)}>
            <Ionicons name="eye-outline" size={18} color="#8a3237" />
            <Text style={styles.previewButtonText}>Ver vista previa del timbre</Text>
          </TouchableOpacity>
          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#d32f2f" />
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
      </AppView>
      <AppModal
        visible={logoutModalVisible}
        title="Cerrar sesión"
        message="¿Querés salir de tu cuenta ahora?"
        onClose={() => setLogoutModalVisible(false)}
        actions={[
          { label: 'Cancelar', variant: 'secondary' },
          { label: 'Salir', variant: 'destructive', onPress: confirmLogout },
        ]}
      />
      <AppModal
        visible={tutorialStep !== null}
        title={`Configurar el timbre · ${(tutorialStep ?? 0) + 1}/3`}
        message={[
          'Primero elegí el nombre que verá la persona al escanear tu QR y escribí el mensaje de bienvenida.',
          'Después configurá los días y horarios en los que querés recibir mensajes. Fuera de ese horario se mostrará “Fuera de horario”.',
          'Por último, abrí la vista previa para comprobar cómo se verá tu timbre antes de guardar los cambios.',
        ][tutorialStep ?? 0]}
        onClose={() => setTutorialStep(null)}
        actions={[
          { label: 'Cerrar', variant: 'secondary' },
          { label: tutorialStep === 2 ? 'Ver vista previa' : 'Siguiente', onPress: async () => { if (tutorialStep === 2) { setTutorialStep(null); setPreviewVisible(true); } else { setTutorialStep((tutorialStep ?? 0) + 1); } } },
        ]}
      />
      <AppModal
        visible={previewVisible}
        title="Vista previa del timbre"
        message="Así verá tu información una persona que escanee tu QR."
        onClose={() => setPreviewVisible(false)}
        actions={[{ label: 'Cerrar', variant: 'secondary' }]}
      >
        <View style={styles.chatPreview}>
          <View style={styles.chatPreviewHeader}>
            <Ionicons name="notifications-outline" size={20} color="#d32f2f" />
            <View style={styles.chatPreviewHeaderCopy}>
              <Text style={styles.chatPreviewName}>{displayNameDraft.trim() || user?.name || 'Tu timbre'}</Text>
              <Text style={styles.chatPreviewStatus}>{visitorStatus === 'available' ? 'Disponible' : visitorStatus === 'off_hours' ? 'Fuera de horario' : 'No disponible'}</Text>
            </View>
          </View>
          <View style={styles.chatPreviewMessage}><Text style={styles.chatPreviewMessageText}>{welcomeDraft.trim() || 'Escribí tu mensaje y te responderemos pronto.'}</Text></View>
          <View style={styles.chatPreviewGuest}><Text style={styles.chatPreviewGuestText}>Hola, quiero contactarte.</Text></View>
          <View style={styles.chatPreviewInput}><Text style={styles.chatPreviewPlaceholder}>Escribí tu mensaje...</Text><Ionicons name="send" size={16} color="#d32f2f" /></View>
        </View>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFFFF',
  },
  content: {
    padding: 16,
    justifyContent: 'flex-start',
    gap: 10,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8EDEF',
  },
  label: {
    color: '#5F5759',
    fontFamily: 'BaiJamjuree',
    fontSize: 13,
  },
  name: {
    color: '#3D3D3D',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  installationDate: { color: '#2E9D63', fontFamily: 'BaiJamjuree-Bold', fontSize: 12, textAlign: 'center' },
  logoutButton: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6D7DA',
    backgroundColor: '#F8EDEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#B5222A',
    fontFamily: 'BaiJamjuree-Bold',
    fontSize: 14,
  },
  settingsCard: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8E8', gap: 8 },
  sectionTitle: { color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 17 },
  sectionText: { color: '#666', fontFamily: 'BaiJamjuree', fontSize: 13, lineHeight: 19 },
  pendingConfigCard: { marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#F0D9A4', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pendingConfigCopy: { flex: 1 },
  pendingConfigTitle: { color: '#765E2C', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  pendingConfigText: { marginTop: 2, color: '#765E2C', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  settingsInput: { minHeight: 78, borderRadius: 11, borderWidth: 1, borderColor: '#D9DFE8', backgroundColor: '#FAFAFA', padding: 11, color: '#333', fontFamily: 'BaiJamjuree', textAlignVertical: 'top' },
  fieldLabel: { marginTop: 8, color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  singleLineInput: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: '#D9DFE8', backgroundColor: '#FAFAFA', paddingHorizontal: 11, color: '#333', fontFamily: 'BaiJamjuree', fontSize: 13 },
  quickChoices: { flexDirection: 'row', gap: 7 },
  quickChoice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#F0D8D8' },
  quickChoiceText: { color: '#8A3237', fontFamily: 'BaiJamjuree-Bold', fontSize: 11 },
  statusChoices: { gap: 7 },
  statusChoice: { paddingVertical: 10, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: '#D9DFE8', backgroundColor: '#FFF' },
  statusChoiceActive: { borderColor: '#D32F2F', backgroundColor: '#FFF0F0' },
  statusChoiceText: { color: '#666', fontFamily: 'BaiJamjuree', fontSize: 12 },
  statusChoiceTextActive: { color: '#D32F2F', fontFamily: 'BaiJamjuree-Bold' },
  saveSettingsButton: { minHeight: 44, borderRadius: 11, backgroundColor: '#F8EDEF', borderWidth: 1, borderColor: '#E6D7DA', alignItems: 'center', justifyContent: 'center' },
  saveSettingsText: { color: '#D32F2F', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  previewButton: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: '#E6D7DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  previewButtonText: { color: '#8A3237', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  errorText: { color: '#B3261E', fontFamily: 'BaiJamjuree', fontSize: 12 },
  scheduleTitle: { marginTop: 8, color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 14 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayToggle: { flex: 1, minHeight: 38, paddingHorizontal: 8, borderRadius: 9, borderWidth: 1, borderColor: '#D9DFE8', backgroundColor: '#FFF', justifyContent: 'center' },
  dayToggleActive: { borderColor: '#D32F2F', backgroundColor: '#FFF0F0' },
  dayText: { color: '#666', fontFamily: 'BaiJamjuree', fontSize: 11 },
  dayTextActive: { color: '#D32F2F', fontFamily: 'BaiJamjuree-Bold' },
  timeInput: { width: 54, minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: '#D9DFE8', backgroundColor: '#FAFAFA', textAlign: 'center', color: '#333', fontFamily: 'BaiJamjuree', fontSize: 12 },
  timeDash: { color: '#777', fontFamily: 'BaiJamjuree' },
  chatPreview: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: '#F8F4F6', borderWidth: 1, borderColor: '#E6D7DA', gap: 10 },
  chatPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  chatPreviewHeaderCopy: { flex: 1 },
  chatPreviewName: { color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 14 },
  chatPreviewStatus: { marginTop: 2, color: '#2E9D63', fontFamily: 'BaiJamjuree', fontSize: 11 },
  chatPreviewMessage: { alignSelf: 'flex-start', maxWidth: '88%', padding: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8' },
  chatPreviewMessageText: { color: '#555', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  chatPreviewGuest: { alignSelf: 'flex-end', maxWidth: '80%', padding: 10, borderRadius: 12, backgroundColor: '#FADBDD' },
  chatPreviewGuestText: { color: '#6F1D24', fontFamily: 'BaiJamjuree', fontSize: 12 },
  chatPreviewInput: { minHeight: 38, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatPreviewPlaceholder: { color: '#999', fontFamily: 'BaiJamjuree', fontSize: 11 },
});
