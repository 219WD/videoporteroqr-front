import React, { useContext, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AuthContext } from '../context/AuthContext';
import { api } from '../utils/api';
import { createLogger } from '../utils/logger';
import { hasSeenNotificationId, markNotificationSeen } from '../utils/notificationDeduper';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEVICE_ID_KEY = 'push-device-id';
const DEFAULT_NOTIFICATION_SOUND = 'doorbell.wav';
const DEFAULT_NOTIFICATION_CHANNEL = 'doorbell';
const log = createLogger('push-bridge');

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    'c25b3c79-2ed8-4e77-ac3c-211cf738f05e'
  );
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL, {
    name: 'Doorbell',
    importance: Notifications.AndroidImportance.HIGH,
    sound: DEFAULT_NOTIFICATION_SOUND,
    vibrationPattern: [0, 300, 200, 300],
  });
}

function extractNotificationData(item: any) {
  return item?.notification?.request?.content?.data || item?.request?.content?.data || {};
}

function getNotificationId(data: any) {
  return data?.notificationId || null;
}

function navigateFromNotification(data: any) {
  const notificationId = getNotificationId(data);
  const targetConversationId = data?.conversationId || data?.callId || data?.params?.callId || null;

  log.info('navigate:start', {
    notificationId,
    screen: data?.screen || null,
    conversationId: targetConversationId,
    params: data?.params || null,
  });

  if (notificationId && hasSeenNotificationId(notificationId)) {
    log.info('navigate:skip-seen', { notificationId });
    return;
  }

  if (notificationId) {
    log.info('navigate:mark-seen', { notificationId });
    markNotificationSeen(notificationId);
  }

  const screen = data?.screen;
  if (!screen && !targetConversationId) {
    return;
  }

  const pathname = screen || '/chat/[callId]';
  const params = data?.params || (targetConversationId ? { callId: targetConversationId } : {});

  router.push({
    pathname,
    params,
  });

  log.info('navigate:done', {
    notificationId,
    pathname,
    params,
  });
}

export default function PushNotificationBridge() {
  const { user } = useContext(AuthContext);
  const registrationRef = useRef<{ userId: string | null; token: string | null }>({
    userId: null,
    token: null,
  });
  const appStateRef = useRef(AppState.currentState);
  const lastHandledResponseRef = useRef('');

  useEffect(() => {
    let active = true;
    let receivedSubscription: Notifications.Subscription | null = null;
    let responseSubscription: Notifications.Subscription | null = null;
    let appStateSubscription: any = null;

    async function registerPushToken() {
      try {
        if (!Device.isDevice) return;
        if (!user?.id) return;

        const projectId = getProjectId();
        if (!projectId) return;

        log.info('register:start', {
          userId: user?.id || null,
          projectId,
          platform: Platform.OS,
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        const deviceId = await getDeviceId();
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenResponse?.data;
        if (!expoPushToken || !active) return;

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

        log.info('register:done', {
          userId: user?.id || null,
          tokenPrefix: expoPushToken.slice(0, 18),
        });
      } catch {
        // Keep the bridge non-blocking.
      }
    }

    async function handleResponse(response: any) {
      const actionIdentifier = response?.actionIdentifier;
      const data = extractNotificationData(response);
      const notificationId = getNotificationId(data);
      const responseKey = `${notificationId || 'no-id'}:${actionIdentifier || 'default'}`;

      log.info('response:received', {
        responseKey,
        actionIdentifier: actionIdentifier || null,
        notificationId,
        screen: data?.screen || null,
        conversationId: data?.conversationId || data?.callId || data?.params?.callId || null,
        params: data?.params || null,
      });

      if (responseKey === lastHandledResponseRef.current) {
        log.info('response:skip-duplicate', { responseKey });
        return;
      }

      lastHandledResponseRef.current = responseKey;

      if (notificationId && hasSeenNotificationId(notificationId)) {
        log.info('response:skip-seen', { notificationId, responseKey });
        return;
      }

      navigateFromNotification(data);

      try {
        await Notifications.clearLastNotificationResponseAsync();
        log.info('response:cleared-last-response', { responseKey });
      } catch {
        // Ignore clearing issues; navigation already happened.
        log.warn('response:clear-failed', { responseKey });
      }
    }

    async function bootstrap() {
      log.info('bootstrap:start', { userId: user?.id || null, platform: Platform.OS });
      await ensureAndroidNotificationChannel();
      await registerPushToken();

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      log.info('bootstrap:last-response', {
        hasLastResponse: Boolean(lastResponse),
        notificationId: lastResponse ? getNotificationId(extractNotificationData(lastResponse)) : null,
        screen: lastResponse ? extractNotificationData(lastResponse)?.screen || null : null,
      });
      if (lastResponse) {
        await handleResponse(lastResponse);
      }

      try {
        await Notifications.clearLastNotificationResponseAsync();
        log.info('bootstrap:cleared-last-response');
      } catch {
        // Ignore clearing issues on bootstrap.
        log.warn('bootstrap:clear-failed');
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
      const notificationId = getNotificationId(data);
      log.info('received', {
        notificationId,
        screen: data?.screen || null,
        conversationId: data?.conversationId || data?.callId || data?.params?.callId || null,
      });

      if (notificationId && hasSeenNotificationId(notificationId)) {
        log.info('received:skip-seen', { notificationId });
        return;
      }

      log.info('received:accepted', {
        notificationId,
      });
    });

    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      log.info('response-listener-fired');
      handleResponse(response).catch(() => {});
    });

    return () => {
      active = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
      appStateSubscription?.remove();
    };
  }, [user?.id, user?.role]);

  return null;
}
