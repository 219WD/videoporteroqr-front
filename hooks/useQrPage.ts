import { useCallback, useEffect, useState } from 'react';
import { api } from '@/utils/api';

type QrResponse = {
  name?: string | null;
  qrCode?: string | null;
  qrDataUrl?: string | null;
  qrUrl?: string | null;
  shareUrl?: string | null;
  qrStatus?: 'active' | 'paused' | 'blocked';
  plateStatus?: 'active' | 'damaged' | 'replacement_requested';
  plateRequestStatus?: PlateRequestStatus;
  plateReplacementRequestedAt?: string | null;
  plateInstalledAt?: string | null;
  installationScheduledAt?: string | null;
  plateRequestHistory?: Array<{ status: PlateRequestStatus; changedAt: string }>;
  visitorSettingsConfigured?: boolean;
  visitorDisplayName?: string | null;
  visitorWelcomeMessage?: string | null;
  visitorStatus?: 'available' | 'off_hours' | 'unavailable';
  visitorSchedule?: VisitorSchedule;
};

export type ScheduleDay = { day: number; enabled: boolean; start: string; end: string };
export type VisitorSchedule = ScheduleDay[];

export const DEFAULT_VISITOR_SCHEDULE: VisitorSchedule = Array.from({ length: 7 }, (_, day) => ({
  day,
  enabled: day > 0 && day < 6,
  start: '09:00',
  end: '18:00',
}));

export type QrStatus = 'loading' | 'available' | 'paused' | 'blocked' | 'unavailable' | 'error';
export type PlateRequestStatus = 'none' | 'pending' | 'in_production' | 'ready_for_installation' | 'installed' | 'rejected';
export type PlateRequestDetails = { shippingAddress: string; contactPhone: string };

const ANONYMOUS_WEB_APP_URL = 'https://videoporteroqr-web-anon-peach.vercel.app';

function buildQrUrl(code: string, response: QrResponse) {
  const apiUrl = response.qrUrl || response.shareUrl;

  if (typeof apiUrl === 'string' && apiUrl.trim()) {
    return apiUrl.trim();
  }

  return `${ANONYMOUS_WEB_APP_URL}/qr/${encodeURIComponent(code)}`;
}

export function useQrPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'active' | 'paused' | 'blocked'>('active');
  const [plateStatus, setPlateStatus] = useState<'active' | 'damaged' | 'replacement_requested'>('active');
  const [plateRequestStatus, setPlateRequestStatus] = useState<PlateRequestStatus>('none');
  const [plateInstalledAt, setPlateInstalledAt] = useState<string | null>(null);
  const [installationScheduledAt, setInstallationScheduledAt] = useState<string | null>(null);
  const [plateRequestHistory, setPlateRequestHistory] = useState<Array<{ status: PlateRequestStatus; changedAt: string }>>([]);
  const [visitorSettingsConfigured, setVisitorSettingsConfigured] = useState(false);
  const [visitorDisplayName, setVisitorDisplayName] = useState<string | null>(null);
  const [visitorWelcomeMessage, setVisitorWelcomeMessage] = useState('Escribí tu mensaje y te responderemos pronto.');
  const [visitorStatus, setVisitorStatus] = useState<'available' | 'off_hours' | 'unavailable'>('available');
  const [visitorSchedule, setVisitorSchedule] = useState<VisitorSchedule>(DEFAULT_VISITOR_SCHEDULE);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const loadQr = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setStatus('loading');
    }

    try {
      const { data } = await api.get<QrResponse>('/auth/qr');
      const nextCode = typeof data?.qrCode === 'string' && data.qrCode.trim() ? data.qrCode.trim() : null;
      const nextImage = typeof data?.qrDataUrl === 'string' && data.qrDataUrl ? data.qrDataUrl : null;
      const nextQrStatus = data?.qrStatus || 'active';

      setQrCode(nextCode);
      setQrDataUrl(nextImage);
      setName(data?.name || null);
      setQrStatus(nextQrStatus);
      setPlateStatus(data?.plateStatus || 'active');
      setPlateRequestStatus(data?.plateRequestStatus || 'none');
      setPlateInstalledAt(data?.plateInstalledAt || null);
      setInstallationScheduledAt(data?.installationScheduledAt || null);
      setPlateRequestHistory(Array.isArray(data?.plateRequestHistory) ? data.plateRequestHistory : []);
      setVisitorSettingsConfigured(data?.visitorSettingsConfigured === true);
      setVisitorDisplayName(data?.visitorDisplayName || null);
      setVisitorWelcomeMessage(data?.visitorWelcomeMessage || 'Escribí tu mensaje y te responderemos pronto.');
      setVisitorStatus(data?.visitorStatus || 'available');
      setVisitorSchedule(data?.visitorSchedule?.length === 7 ? data.visitorSchedule : DEFAULT_VISITOR_SCHEDULE);
      setQrUrl(nextCode ? buildQrUrl(nextCode, data ?? {}) : null);
      setStatus(nextQrStatus === 'paused' ? 'paused' : nextQrStatus === 'blocked' ? 'blocked' : nextCode && nextImage ? 'available' : 'unavailable');
    } catch (error: any) {
      setQrCode(null);
      setQrDataUrl(null);
      setQrUrl(null);
      setName(null);
      setPlateInstalledAt(null);
      setInstallationScheduledAt(null);
      setPlateRequestHistory([]);
      setVisitorSettingsConfigured(false);
      setStatus(error?.response?.status === 404 ? 'unavailable' : 'error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const reportAsset = useCallback(async (asset: 'qr' | 'plate', type: 'damaged' | 'unreadable' | 'lost' | 'replacement' | 'new_plate', details?: PlateRequestDetails) => {
    setActionError(null);
    try {
      await api.post('/dashboard/qr/report', { asset, type, ...details });
      await loadQr(true);
    } catch (error: any) {
      setActionError(error?.response?.data?.error || 'No pudimos registrar el reporte. Intentá nuevamente.');
    }
  }, [loadQr]);

  const setQrAvailability = useCallback(async (nextStatus: 'active' | 'paused') => {
    setActionError(null);
    try {
      await api.patch('/dashboard/qr/status', { status: nextStatus });
      await loadQr(true);
    } catch (error: any) {
      setActionError(error?.response?.data?.error || 'No pudimos actualizar el estado del QR. Intentá nuevamente.');
    }
  }, [loadQr]);

  const saveVisitorSettings = useCallback(async (nextMessage: string, nextStatus: 'available' | 'off_hours' | 'unavailable', nextSchedule: VisitorSchedule = visitorSchedule, nextDisplayName: string = visitorDisplayName || '', configurationComplete = visitorSettingsConfigured) => {
    setActionError(null);
    try {
      const { data } = await api.patch('/dashboard/qr/visitor-settings', {
        visitorWelcomeMessage: nextMessage,
        visitorDisplayName: nextDisplayName.trim(),
        visitorStatus: nextStatus,
        visitorSchedule: nextSchedule,
        configurationComplete,
      });
      setVisitorWelcomeMessage(data?.visitorWelcomeMessage || nextMessage);
      setVisitorDisplayName(data?.visitorDisplayName || nextDisplayName.trim() || null);
      setVisitorStatus(data?.visitorStatus || nextStatus);
      setVisitorSchedule(data?.visitorSchedule?.length === 7 ? data.visitorSchedule : nextSchedule);
      setVisitorSettingsConfigured(data?.visitorSettingsConfigured === true);
    } catch (error: any) {
      setActionError(error?.response?.data?.error || 'No pudimos guardar la configuración del visitante.');
      throw error;
    }
  }, [visitorDisplayName, visitorSchedule, visitorSettingsConfigured]);

  useEffect(() => {
    void loadQr();
  }, [loadQr]);

  return {
    qrCode,
    qrDataUrl,
    qrUrl,
    name,
    qrStatus,
    plateStatus,
    plateRequestStatus,
    plateInstalledAt,
    installationScheduledAt,
    plateRequestHistory,
    visitorSettingsConfigured,
    visitorDisplayName,
    actionError,
    reportAsset,
    setQrAvailability,
    visitorWelcomeMessage,
    visitorStatus,
    visitorSchedule,
    saveVisitorSettings,
    status,
    refreshing,
    reload: () => loadQr(true),
  };
}
