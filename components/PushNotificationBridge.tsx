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
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEVICE_ID_KEY = 'push-device-id';
const CALL_CATEGORY_ID = 'call_invite';
const CALL_ACCEPT_ACTION = 'call_accept';
const CALL_REJECT_ACTION = 'call_reject';

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

function getNotificationId(data) {
  return data?.notificationId || null;
}

function navigateFromNotification(data) {
  const notificationId = getNotificationId(data);

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
        role: data?.params?.role || 'callee',
      },
    });
  }
}

async function handleCallInviteAction(data, actionIdentifier) {
  const callId = data?.callId;
  const callKind = data?.callKind || 'session';

  if (!callId) {
    return;
  }

  const endpoints = {
    session: {
      accept: `/calls/sessions/${callId}/accept`,
      reject: `/calls/sessions/${callId}/reject`,
    },
    video: {
      accept: '/videocall/accept-call',
      reject: '/videocall/reject-call',
    },
  };

  const endpointSet = endpoints[callKind] || endpoints.session;

  if (actionIdentifier === CALL_REJECT_ACTION) {
    try {
      await api.post(endpointSet.reject, { callId });
    } catch (error) {
      console.log('[push] no se pudo rechazar desde notificacion:', error?.message || error);
    }
    return;
  }

  if (actionIdentifier === CALL_ACCEPT_ACTION) {
    try {
      await api.post(endpointSet.accept, { callId });
    } catch (error) {
      console.log('[push] no se pudo aceptar desde notificacion:', error?.message || error);
    }
  }

  router.push({
    pathname: '/calls/[callId]',
    params: {
      callId,
      role: data?.params?.role || 'callee',
    },
  });
}

export default function PushNotificationBridge() {
  const { user } = useContext(AuthContext);
  const registrationRef = useRef({ userId: null, token: null });
  const appStateRef = useRef(AppState.currentState);
  const lastHandledResponseRef = useRef('');

  useEffect(() => {
    let active = true;
    let receivedSubscription = null;
    let responseSubscription = null;
    let appStateSubscription = null;

    async function ensureNotificationCategories() {
      try {
        await Notifications.setNotificationCategoryAsync(
          CALL_CATEGORY_ID,
          [
            {
              identifier: CALL_ACCEPT_ACTION,
              buttonTitle: 'Atender',
              options: {
                opensAppToForeground: true,
              },
            },
            {
              identifier: CALL_REJECT_ACTION,
              buttonTitle: 'Rechazar',
              options: {
                isDestructive: true,
                opensAppToForeground: false,
              },
            },
          ],
        );
      } catch (error) {
        console.log('[push] no se pudo registrar la categoria de llamadas:', error?.message || error);
      }
    }

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

    async function handleResponse(response) {
      const actionIdentifier = response?.actionIdentifier;
      const data = extractNotificationData(response);
      const notificationId = getNotificationId(data);
      const responseKey = `${notificationId || 'no-id'}:${actionIdentifier || 'default'}`;

      if (responseKey === lastHandledResponseRef.current) {
        return;
      }

      lastHandledResponseRef.current = responseKey;

      if (notificationId && hasSeenNotificationId(notificationId)) {
        return;
      }

      if (notificationId) {
        markNotificationSeen(notificationId);
      }

      if (data?.type === 'call_invite' || data?.type === 'video_call_invite' || data?.callId) {
        if (actionIdentifier === CALL_REJECT_ACTION || actionIdentifier === CALL_ACCEPT_ACTION) {
          await handleCallInviteAction(data, actionIdentifier);
          return;
        }
      }

      navigateFromNotification(data);
    }

    async function bootstrap() {
      await ensureNotificationCategories();
      await registerPushToken();

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        await handleResponse(lastResponse);
      }
    }

    bootstrap();

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
      handleResponse(response).catch((error) => {
        console.log('[push] no se pudo manejar la respuesta de la notificacion:', error?.message || error);
      });
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
