export function formatTime(ms?: number | null) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatClock(dateString?: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isConversationExpired(conversation: {
  expireAt?: string | null;
  timeoutAt?: string | null;
  status?: string | null;
  createdAt?: string | null;
}) {
  const expireAt = conversation?.expireAt || conversation?.timeoutAt || null;

  if (expireAt) {
    const expireAtMs = new Date(expireAt).getTime();
    if (!Number.isNaN(expireAtMs)) {
      return Date.now() >= expireAtMs;
    }
  }

  if (!conversation?.status) return false;
  if (conversation.status !== 'pending') return true;

  if (!conversation.createdAt) return false;

  const createdAtMs = new Date(conversation.createdAt).getTime();
  if (Number.isNaN(createdAtMs)) return false;

  const expiresAfterMs = 60 * 1000;
  return Date.now() - createdAtMs >= expiresAfterMs;
}
