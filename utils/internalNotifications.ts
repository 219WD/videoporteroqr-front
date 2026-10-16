export type InternalNotification = {
  notificationId: string;
  title: string;
  body: string;
  groupKey?: string;
  data: Record<string, any>;
  count?: number;
};

type Listener = (notification: InternalNotification) => void;

const listeners = new Set<Listener>();
const recentIds = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

export function subscribeToInternalNotifications(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishInternalNotification(payload: any) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
  const notificationId = String(payload?.notificationId || data.notificationId || '').trim();
  if (!notificationId) return;

  const now = Date.now();
  const previous = recentIds.get(notificationId);
  if (previous && now - previous < DEDUPE_WINDOW_MS) return;
  recentIds.set(notificationId, now);
  if (recentIds.size > 200) recentIds.delete(recentIds.keys().next().value as string);

  const notification: InternalNotification = {
    notificationId,
    title: String(payload?.title || 'Nueva notificación'),
    body: String(payload?.body || ''),
    groupKey: typeof data.groupKey === 'string' ? data.groupKey : undefined,
    data,
  };

  listeners.forEach((listener) => listener(notification));
}
