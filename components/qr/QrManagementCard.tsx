import Ionicons from '@expo/vector-icons/Ionicons';
import AppModal from '@/components/AppModal';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { PlateRequestDetails, PlateRequestStatus, QrStatus } from '@/hooks/useQrPage';

type Props = {
  qrDataUrl: string | null;
  qrUrl: string | null;
  status: QrStatus;
  plateStatus: 'active' | 'damaged' | 'replacement_requested';
  plateRequestStatus: PlateRequestStatus;
  plateInstalledAt: string | null;
  installationScheduledAt: string | null;
  plateRequestHistory: Array<{ status: PlateRequestStatus; changedAt: string }>;
  actionError: string | null;
  refreshing: boolean;
  onReload: () => void;
  reportAsset: (asset: 'qr' | 'plate', type: 'damaged' | 'unreadable' | 'lost' | 'replacement' | 'new_plate', details?: PlateRequestDetails) => Promise<void>;
  setQrAvailability: (status: 'active' | 'paused') => Promise<void>;
  initialRequestOpen?: boolean;
};

const plateRequestCopy: Record<PlateRequestStatus, { title: string; detail: string }> = {
  none: { title: 'Todavía no solicitaste tu placa', detail: 'Solicitala para que podamos prepararla.' },
  pending: { title: 'Solicitud recibida', detail: 'Estamos revisando tu solicitud para comenzar a preparar la placa.' },
  in_production: { title: 'Placa en fabricación', detail: 'Estamos fabricando tu placa física.' },
  ready_for_installation: { title: 'Placa lista para instalar', detail: 'Tu placa ya está lista para colocarla en la entrada.' },
  installed: { title: 'Placa instalada', detail: 'Tu placa ya está lista para que puedan escanearla y tocar el timbre.' },
  rejected: { title: 'Solicitud rechazada', detail: 'Podés solicitar una nueva placa cuando quieras.' },
};

function plateStatusLabel(status: PlateRequestStatus) {
  return plateRequestCopy[status]?.title || status;
}

function formatInstallationDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function QrManagementCard({ qrDataUrl, qrUrl, status, plateStatus = 'active', plateRequestStatus = 'none', plateInstalledAt = null, installationScheduledAt = null, plateRequestHistory = [], actionError, refreshing, onReload, reportAsset, setQrAvailability, initialRequestOpen = false }: Props) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null);
  const [plateRequestModalVisible, setPlateRequestModalVisible] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [plateRequestError, setPlateRequestError] = useState<string | null>(null);
  const requestCopy = plateRequestCopy[plateRequestStatus] || plateRequestCopy.none;
  const requestInProgress = ['pending', 'in_production', 'ready_for_installation', 'installed'].includes(plateRequestStatus) || (plateRequestStatus === 'none' && plateStatus === 'replacement_requested');

  const askConfirmation = (title: string, message: string, run: () => Promise<void>) => {
    setConfirmAction({ title, message, run });
  };

  const openPlateRequestForm = () => {
    setPlateRequestError(null);
    setPlateRequestModalVisible(true);
  };

  const submitPlateRequest = async () => {
    const details: PlateRequestDetails = { shippingAddress: shippingAddress.trim(), contactPhone: contactPhone.trim() };
    if (details.shippingAddress.length < 8) {
      setPlateRequestError('Escribí la dirección exacta donde debemos enviar la placa.');
      return;
    }
    if (details.contactPhone.length < 7) {
      setPlateRequestError('Escribí un número de contacto válido.');
      return;
    }
    setPlateRequestModalVisible(false);
    await reportAsset('plate', 'new_plate', details);
  };

  useEffect(() => {
    if (status !== 'loading' && initialRequestOpen && (plateRequestStatus === 'none' || plateRequestStatus === 'rejected')) {
      openPlateRequestForm();
    }
  }, [initialRequestOpen, plateRequestStatus, status]);

  const share = async (content: { title?: string; message: string; url?: string }) => {
    if (sharing) return;

    setShareError(false);
    setSharing(true);

    try {
      await Share.share(content);
    } catch {
      setShareError(true);
    } finally {
      setSharing(false);
    }
  };

  const shareLink = async () => {
    if (!qrUrl) return;
    await share({ title: 'Enlace de acceso', message: qrUrl, url: qrUrl });
  };

  if (status === 'loading') {
    return (
      <View style={styles.stateCard}>
        <ActivityIndicator color="#d32f2f" />
        <Text style={styles.stateText}>Cargando tu QR...</Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View style={styles.stateCard}>
        <Ionicons name="qr-code-outline" size={38} color="#999" />
        <Text style={styles.stateTitle}>QR no disponible</Text>
        <Text style={styles.stateText}>Esta cuenta todavía no tiene un código QR asignado.</Text>
        <TouchableOpacity style={styles.outlineButton} onPress={onReload} disabled={refreshing}>
          {refreshing ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.outlineButtonText}>Volver a intentar</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.stateCard}>
        <Ionicons name="cloud-offline-outline" size={38} color="#d32f2f" />
        <Text style={styles.stateTitle}>No pudimos cargar tu QR</Text>
        <Text style={styles.stateText}>Revisá tu conexión e intentá nuevamente.</Text>
        <TouchableOpacity style={styles.outlineButton} onPress={onReload} disabled={refreshing}>
          {refreshing ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.outlineButtonText}>Reintentar</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'paused' || status === 'blocked') {
    const blocked = status === 'blocked';
    return (
      <View style={styles.stateCard}>
        <Ionicons name={blocked ? 'lock-closed-outline' : 'pause-circle-outline'} size={38} color="#d32f2f" />
        <Text style={styles.stateTitle}>QR {blocked ? 'bloqueado' : 'pausado'}</Text>
        <Text style={styles.stateText}>{blocked ? 'Un administrador bloqueó este código.' : 'El QR está temporalmente pausado y no abre conversaciones.'}</Text>
        <TouchableOpacity style={styles.outlineButton} onPress={onReload} disabled={refreshing}>
          {refreshing ? <ActivityIndicator color="#d32f2f" /> : <Text style={styles.outlineButtonText}>Actualizar estado</Text>}
        </TouchableOpacity>
        {!blocked ? <TouchableOpacity style={styles.primaryButton} onPress={() => void setQrAvailability('active')} disabled={refreshing}><Ionicons name="play-outline" size={18} color="#fff" /><Text style={styles.primaryButtonText}>Reactivar QR</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.tertiaryButton} onPress={() => askConfirmation('Reportar problema', 'El QR quedará pausado mientras revisamos el problema.', () => reportAsset('qr', 'unreadable'))}>
          <Text style={styles.tertiaryButtonText}>Reportar problema con el QR</Text>
        </TouchableOpacity>
        {actionError ? <Text style={styles.shareError}>{actionError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Tu placa Portero QR</Text>
          {plateRequestStatus !== 'installed' ? <Text style={styles.cardSubtitle}>Solicitá tu placa para colocarla en la entrada.</Text> : null}
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Activo</Text>
        </View>
      </View>
      {plateRequestStatus !== 'installed' ? <View style={styles.plateMessage}>
        <Ionicons name="information-circle-outline" size={20} color="#8A3237" />
        <Text style={styles.plateMessageText}>Así se verá tu placa original. Cuando la recibas, colocala en la entrada para que puedan escanearla y tocar el timbre.</Text>
      </View> : null}
      {plateRequestStatus !== 'installed' ? <View style={[styles.requestStatusCard, plateRequestStatus === 'rejected' ? styles.requestStatusRejected : null]}>
        <Text style={styles.requestStatusTitle}>{requestCopy.title}</Text>
        <Text style={styles.requestStatusText}>{requestCopy.detail}{plateRequestStatus === 'ready_for_installation' && installationScheduledAt ? ` Fecha y horario estimado: ${formatInstallationDateTime(installationScheduledAt)} hs.` : ''}</Text>
      </View> : null}
      {plateRequestStatus === 'installed' && plateInstalledAt ? <Text style={styles.installationDate}>Placa instalada el {new Date(plateInstalledAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text> : null}
      {plateRequestHistory.length > 0 && plateRequestStatus !== 'installed' ? <View style={styles.historyCard}><Text style={styles.historyTitle}>Historial de la placa</Text>{plateRequestHistory.map((entry, index) => <Text key={`${entry.changedAt}-${index}`} style={styles.historyItem}>{plateStatusLabel(entry.status)} · {new Date(entry.changedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>)}</View> : null}
      <View style={styles.platePreview}>
        <Text style={styles.plateEyebrow}>VISTA PREVIA DE LA PLACA ORIGINAL</Text>
        <View style={styles.physicalPlate}>
          <View style={styles.plateLogoRow}><Image source={require('../../assets/images/isologo-color.png')} style={styles.plateLogo} resizeMode="contain" /></View>
          <View style={styles.plateQrArea}>
            <View style={styles.plateQrBox}><Image source={{ uri: qrDataUrl ?? undefined }} style={styles.plateQr} resizeMode="contain" /></View>
          </View>
          <View style={styles.plateFooter}>
            <View style={styles.bellRow}><Text style={styles.bellWaveLeft}>))</Text><Ionicons name="notifications-outline" size={18} color="#F1F1F1" /><Text style={styles.bellWaveRight}>((</Text></View>
            <Text style={styles.plateFooterText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>ESCANEÁ Y TOCÁ EL TIMBRE</Text>
          </View>
          <View style={styles.plateBottomSpace} />
        </View>
      </View>
      <Text style={styles.helper}>{plateRequestStatus === 'installed' ? 'Si tus visitas no pueden escanear el código, compartiles este enlace directo para que puedan contactarte.' : 'Hasta recibir la placa, también podés compartir el enlace directo para que te contacten.'}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={shareLink} disabled={sharing}>
          <Ionicons name="link-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Compartir enlace directo</Text>
        </TouchableOpacity>
      </View>
      {shareError ? <Text style={styles.shareError}>No pudimos abrir el menú para compartir. Intentá nuevamente.</Text> : null}
      <View style={styles.issueBox}>
        <Text style={styles.issueTitle}>{plateRequestStatus === 'installed' ? 'Placa instalada' : '¿Todavía no tenés tu placa?'}</Text>
        <Text style={styles.issueText}>{plateRequestStatus === 'installed' ? 'Tu placa ya está colocada y activa. Si detectás algún problema con la placa o el QR, podés reportarlo desde acá.' : 'Solicitá la placa física para colocarla en la entrada. Si ya la recibiste y está dañada, también podés reportarla desde acá.'}</Text>
        {plateRequestStatus !== 'installed' ? <TouchableOpacity style={styles.issueButtonPrimary} onPress={openPlateRequestForm} disabled={requestInProgress}><Text style={styles.issueButtonPrimaryText}>{requestInProgress ? 'Solicitud enviada' : plateRequestStatus === 'rejected' ? 'Solicitar nuevamente' : 'Solicitar mi placa'}</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.issueButton} onPress={() => askConfirmation('Reportar placa dañada', 'Vamos a registrar el problema para que pueda revisarse.', () => reportAsset('plate', 'damaged'))}><Text style={styles.issueButtonText}>Reportar placa dañada</Text></TouchableOpacity>
        <TouchableOpacity style={styles.issueButton} onPress={() => askConfirmation('Reportar QR dañado', 'El QR se pausará hasta que podamos revisarlo.', () => reportAsset('qr', 'damaged'))}><Text style={styles.issueButtonText}>Reportar QR dañado</Text></TouchableOpacity>
        {actionError ? <Text style={styles.shareError}>{actionError}</Text> : null}
      </View>
      <TouchableOpacity style={styles.pauseButton} onPress={() => askConfirmation('Pausar QR', 'Mientras esté pausado, nadie podrá iniciar una conversación desde este código.', () => setQrAvailability('paused'))} disabled={refreshing}>
        <Ionicons name="pause-circle-outline" size={17} color="#8a3237" />
        <Text style={styles.pauseButtonText}>Pausar QR temporalmente</Text>
      </TouchableOpacity>
      <AppModal
        visible={Boolean(confirmAction)}
        title={confirmAction?.title || ''}
        message={confirmAction?.message}
        onClose={() => setConfirmAction(null)}
        actions={[
          { label: 'Cancelar', variant: 'secondary' },
          { label: 'Confirmar', variant: 'destructive', onPress: async () => { const action = confirmAction; setConfirmAction(null); if (action) await action.run(); } },
        ]}
      />
      <AppModal
        visible={plateRequestModalVisible}
        title="Solicitar placa nueva"
        message="Completá estos datos para que podamos preparar y enviarte tu placa."
        onClose={() => setPlateRequestModalVisible(false)}
        actions={[
          { label: 'Cancelar', variant: 'secondary' },
          { label: 'Enviar solicitud', onPress: submitPlateRequest },
        ]}
      >
        <Text style={styles.modalFieldLabel}>Dirección exacta</Text>
        <TextInput
          value={shippingAddress}
          onChangeText={setShippingAddress}
          placeholder="Calle, número, piso/departamento, localidad"
          placeholderTextColor="#999"
          style={styles.modalInput}
          autoCapitalize="sentences"
        />
        <Text style={styles.modalFieldLabel}>Teléfono de contacto</Text>
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="Ej.: +54 9 11 5555-5555"
          placeholderTextColor="#999"
          style={styles.modalInput}
          keyboardType="phone-pad"
        />
        {plateRequestError ? <Text style={styles.modalError}>{plateRequestError}</Text> : null}
      </AppModal>
      <TouchableOpacity style={styles.refreshButton} onPress={onReload} disabled={refreshing}>
        {refreshing ? <ActivityIndicator color="#666" /> : <Ionicons name="refresh-outline" size={16} color="#666" />}
        <Text style={styles.refreshText}>Actualizar estado</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8' },
  stateCard: { padding: 28, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E8E8', alignItems: 'center', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  cardTitle: { color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 17 },
  cardSubtitle: { maxWidth: 205, marginTop: 3, color: '#777', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  stateTitle: { color: '#3D3D3D', fontSize: 17, fontFamily: 'BaiJamjuree-Bold', textAlign: 'center' },
  stateText: { color: '#666', fontFamily: 'BaiJamjuree', textAlign: 'center', lineHeight: 20 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EAF7F0', flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2e9d63' },
  statusText: { color: '#23784b', fontFamily: 'BaiJamjuree-Bold', fontSize: 12 },
  plateMessage: { marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: '#FFF5F5', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  plateMessageText: { flex: 1, color: '#6F4144', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 18 },
  requestStatusCard: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#F0D9A4' },
  requestStatusComplete: { backgroundColor: '#F1FAF4', borderColor: '#CBE7D4' },
  requestStatusRejected: { backgroundColor: '#FFF3F3', borderColor: '#F0CACA' },
  requestStatusTitle: { color: '#5F4211', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  requestStatusText: { marginTop: 3, color: '#765E2C', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  installationDate: { marginTop: 10, color: '#2E9D63', fontFamily: 'BaiJamjuree-Bold', fontSize: 12, textAlign: 'center' },
  historyCard: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#F8F4F6', borderWidth: 1, borderColor: '#E6D7DA' },
  historyTitle: { color: '#5F5759', fontFamily: 'BaiJamjuree-Bold', fontSize: 12 },
  historyItem: { marginTop: 4, color: '#666', fontFamily: 'BaiJamjuree', fontSize: 11 },
  helper: { marginTop: 14, color: '#666', textAlign: 'center', fontFamily: 'BaiJamjuree', lineHeight: 20 },
  identifierBox: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#F8F4F6' },
  identifierLabel: { color: '#777', fontSize: 12, fontFamily: 'BaiJamjuree' },
  identifier: { marginTop: 4, color: '#3D3D3D', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  linkDivider: { height: 1, marginVertical: 10, backgroundColor: '#EDE7E9' },
  link: { marginTop: 4, color: '#8a3237', fontFamily: 'BaiJamjuree', fontSize: 12 },
  actions: { marginTop: 16, gap: 10 },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: '#d32f2f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontFamily: 'BaiJamjuree-Bold', fontSize: 14 },
  secondaryButton: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#E6D7DA', backgroundColor: '#F8EDEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { color: '#d32f2f', fontFamily: 'BaiJamjuree-Bold', fontSize: 14 },
  tertiaryButton: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tertiaryButtonText: { color: '#555', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  shareError: { marginTop: 10, color: '#b3261e', fontFamily: 'BaiJamjuree', fontSize: 12, textAlign: 'center' },
  outlineButton: { marginTop: 4, paddingHorizontal: 18, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E6D7DA', justifyContent: 'center' },
  outlineButtonText: { color: '#d32f2f', fontFamily: 'BaiJamjuree-Bold' },
  refreshButton: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  refreshText: { color: '#666', fontFamily: 'BaiJamjuree', fontSize: 12 },
  pauseButton: { marginTop: 12, minHeight: 44, borderRadius: 13, backgroundColor: '#fff8e8', borderWidth: 1, borderColor: '#f0d9a4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pauseButtonText: { color: '#8a3237', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  platePreview: { marginTop: 18, padding: 12, borderRadius: 14, backgroundColor: '#f5f5f5' },
  plateEyebrow: { color: '#777', fontFamily: 'BaiJamjuree-Bold', fontSize: 10, letterSpacing: 1 },
  physicalPlate: { marginTop: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: '#282828', borderWidth: 1, borderColor: '#4A4A4A', aspectRatio: 1 },
  plateLogoRow: { flex: 0.28, alignItems: 'center', justifyContent: 'center', paddingTop: 3 },
  plateLogo: { width: 50, height: 50 },
  plateQrArea: { flex: 0.51, alignItems: 'center', justifyContent: 'center' },
  plateQrBox: { width: '46%', aspectRatio: 1, padding: 8, borderRadius: 13, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center' },
  plateQr: { width: '100%', height: '100%' },
  plateFooter: { flex: 0.11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, paddingBottom: 2, gap: 5 },
  bellRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  bellWaveLeft: { color: '#F20D18', fontFamily: 'BaiJamjuree-Bold', fontSize: 10, letterSpacing: -4, transform: [{ rotate: '180deg' }] },
  bellWaveRight: { color: '#F20D18', fontFamily: 'BaiJamjuree-Bold', fontSize: 10, letterSpacing: -4 },
  plateFooterText: { flexShrink: 1, color: '#F0F0F0', fontFamily: 'BaiJamjuree', fontSize: 10, letterSpacing: 1.45, textAlign: 'center' },
  plateBottomSpace: { flex: 0.10 },
  modalFieldLabel: { marginTop: 14, marginBottom: 6, color: '#4A4143', fontFamily: 'BaiJamjuree-Bold', fontSize: 12 },
  modalInput: { minHeight: 46, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: '#E3DADD', backgroundColor: '#fff', color: '#3D3D3D', fontFamily: 'BaiJamjuree', fontSize: 13 },
  modalError: { marginTop: 10, color: '#b3261e', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  issueBox: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: '#fff8f8', borderWidth: 1, borderColor: '#f0d8d8' },
  issueTitle: { color: '#3d3d3d', fontFamily: 'BaiJamjuree-Bold', fontSize: 14 },
  issueText: { marginTop: 5, color: '#777', fontFamily: 'BaiJamjuree', fontSize: 12, lineHeight: 17 },
  issueButton: { marginTop: 9, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0d8d8' },
  issueButtonText: { color: '#b3261e', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
  issueButtonPrimary: { marginTop: 12, minHeight: 44, borderRadius: 11, backgroundColor: '#d32f2f', alignItems: 'center', justifyContent: 'center' },
  issueButtonPrimaryText: { color: '#fff', fontFamily: 'BaiJamjuree-Bold', fontSize: 13 },
});
