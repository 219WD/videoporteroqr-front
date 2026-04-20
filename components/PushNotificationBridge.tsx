// @ts-nocheck
import React, { useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { api } from '../utils/api';
import { hasSeenNotificationId, markNotificationSeen } from '../utils/notificationDeduper';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DEVICE_ID_KEY = 'push-device-id';

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

function extractNotificationData(item) {
  return (
    item?.notification?.request?.content?.data ||
    item?.request?.content?.data ||
    {}
  );
}

function navigateFromNotification(data) {
  const notificationId = data?.notificationId;

  if (notificationId && hasSeenNotificationId(notificationId)) {
    return;
  }

  if (notificationId) {
    markNotificationSeen(notificationId);
  }

  const screen = data?.screen;
  const params = data?.params || {};

  if (screen) {
    router.push({
      pathname: screen,
      params,
    });
    return;
  }

  if (data?.callId) {
    router.push({
      pathname: '/calls/[callId]',
      params: {
        callId: data.callId,
        role: 'callee',
      },
    });
  }
}

export default function PushNotificationBridge() {
  const { user } = useContext(AuthContext);
  const registrationRef = useRef({ userId: null, token: null });
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let active = true;
    let receivedSubscription = null;
    let responseSubscription = null;
    let appStateSubscription = null;

    async function registerPushToken() {
      try {
        if (!Device.isDevice) {
          console.log('[push] registro omitido: no es un dispositivo fisico');
          return;
        }

        const projectId = getProjectId();
        if (!projectId) {
          console.log('[push] registro omitido: falta projectId de EAS');
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[push] permisos de notificacion denegados');
          return;
        }

        const deviceId = await getDeviceId();
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenResponse?.data;

        if (!expoPushToken || !active) {
          console.log('[push] no se obtuvo expoPushToken');
          return;
        }

        if (
          registrationRef.current.token === expoPushToken &&
          registrationRef.current.userId === (user?.id || null)
        ) {
          return;
        }

        await api.post('/notifications/push-tokens', {
          expoPushToken,
          deviceId,
          platform: Platform.OS,
          expoProjectId: projectId,
          appVersion: Constants.expoConfig?.version || null,
          metadata: {
            isDevice: Device.isDevice,
            modelName: Device.modelName || null,
            osName: Device.osName || null,
            osVersion: Device.osVersion || null,
          },
        });

        registrationRef.current = {
          userId: user?.id || null,
          token: expoPushToken,
        };

        console.log('[push] token registrado o actualizado', {
          userId: user?.id || null,
          deviceId,
          platform: Platform.OS,
        });
      } catch (error) {
        console.log('[push] no se pudo registrar el token:', error?.message || error);
      }
    }

    registerPushToken();

    appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextState;

      if (nextState === 'active' && wasBackground) {
        registerPushToken();
      }
    });

    receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = extractNotificationData(notification);

      if (data?.notificationId && hasSeenNotificationId(data.notificationId)) {
        return;
      }

      if (data?.notificationId) {
        markNotificationSeen(data.notificationId);
      }
    });

    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = extractNotificationData(response);
      navigateFromNotification(data);
    });

    return () => {
      active = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, [user?.id]);

  return null;
}
