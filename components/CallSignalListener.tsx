
import React, { useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { router, usePathname } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { SOCKET_URL } from '../utils/backend';
import { hasSeenNotificationId, markNotificationSeen } from '../utils/notificationDeduper';

function handleNotificationPayload(payload) {
  const notificationId = payload?.notificationId || payload?.data?.notificationId;

  if (notificationId && hasSeenNotificationId(notificationId)) {
    return;
  }

  if (notificationId) {
    markNotificationSeen(notificationId);
  }

  const screen = payload?.screen || payload?.data?.screen;
  const params = payload?.params || payload?.data?.params || {};

  if (screen) {
    router.push({
      pathname: screen,
      params,
    });
    return;
  }

  if (payload?.callId) {
    router.push({
      pathname: '/calls/[callId]',
      params: {
        callId: payload.callId,
        role: 'callee',
      },
    });
    return;
  }

  Alert.alert(payload?.title || 'Notificación', payload?.body || 'Tienes una nueva notificación');
}

export default function CallSignalListener() {
  const { user } = useContext(AuthContext);
  const pathname = usePathname();
  const socketRef = useRef<any>(null);

  const isInCallScreen = pathname?.startsWith('/calls/');

  useEffect(() => {
    let active = true;

    async function connectSocket() {
      if (!user?.id) return;

      const token = await AsyncStorage.getItem('token');
      if (!active || !token) return;

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        forceNew: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('user-connected', {
          userId: user.id,
          userType: user.role,
        });
      });

      socket.on('call:invite', handleNotificationPayload);
      socket.on('notification:incoming', handleNotificationPayload);
      socket.on('call:timeout', (payload) => {
        if (isInCallScreen) return;

        Alert.alert(
          'Llamada perdida',
          payload?.callee?.id?.toString?.() === user.id.toString()
            ? 'No respondiste a tiempo'
            : 'Tu contacto no respondió a tiempo',
        );
      });
    }

    connectSocket();

    return () => {
      active = false;
      socketRef.current?.disconnect?.();
    };
  }, [isInCallScreen, user?.id, user?.role]);

  return null;
}
