const seenNotificationIds = new Set<string>();

export function hasSeenNotificationId(notificationId: string) {
  return typeof notificationId === 'string' && seenNotificationIds.has(notificationId);
}

export function markNotificationSeen(notificationId: string) {
  if (typeof notificationId !== 'string' || !notificationId) {
    return;
  }

  seenNotificationIds.add(notificationId);

  if (seenNotificationIds.size > 200) {
    const first = seenNotificationIds.values().next().value;
    if (first) {
      seenNotificationIds.delete(first);
    }
  }
}
