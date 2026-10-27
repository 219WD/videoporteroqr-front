import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  InternalNotification,
  subscribeToInternalNotifications,
} from '../utils/internalNotifications';

function getConversationId(notification: InternalNotification) {
  return notification.data?.conversationId || notification.data?.callId || notification.data?.params?.callId || null;
}

export default function InAppNotificationHost() {
  const [notification, setNotification] = useState<InternalNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeToInternalNotifications((next) => {
    setNotification((current) => {
      if (current?.groupKey && current.groupKey === next.groupKey) {
        return { ...next, count: (current.count || 1) + 1 };
      }
      return next;
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotification(null), 4500);
  }), []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!notification) return null;

  const openNotification = () => {
    const screen = notification.data?.screen || (getConversationId(notification) ? '/chat/[callId]' : null);
    const conversationId = getConversationId(notification);
    if (!screen) return;
    if (conversationId) {
      router.push(`/chat/${encodeURIComponent(conversationId)}`);
      setNotification(null);
      return;
    }
    router.push({
      pathname: screen,
      params: {
        ...(notification.data?.params || {}),
        ...(conversationId ? { callId: conversationId } : {}),
      },
    });
    setNotification(null);
  };

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Pressable onPress={openNotification} style={styles.card} accessibilityRole="button">
        <Text style={styles.title}>{notification.title}</Text>
        <Text numberOfLines={2} style={styles.body}>{notification.body}</Text>
        {(notification.count || 1) > 1 ? <Text style={styles.count}>{notification.count} mensajes nuevos</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 52, left: 16, right: 16, zIndex: 1000 },
  card: { backgroundColor: '#143b3b', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  title: { color: '#fff', fontFamily: 'BaiJamjuree-Bold', fontSize: 15 },
  body: { color: '#e5ffff', fontFamily: 'BaiJamjuree', fontSize: 13, marginTop: 3 },
  count: { color: '#9de5df', fontFamily: 'BaiJamjuree-Bold', fontSize: 11, marginTop: 5 },
});
