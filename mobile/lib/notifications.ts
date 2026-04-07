/**
 * Push notification setup for KrewPact mobile.
 *
 * Uses expo-notifications for local + push notifications.
 * Push token is registered with the KrewPact API for server-sent
 * notifications (task assignments, safety alerts, etc.).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-constants';
import { API_BASE_URL } from '@/constants/config';

/** Configure how notifications appear when app is foregrounded */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and get push token.
 * Returns the Expo push token string, or null if denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Only works on physical devices
  if (!Device.default.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/**
 * Register the push token with the KrewPact API.
 * Called after auth is established.
 */
export async function registerTokenWithApi(pushToken: string, authToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        push_token: pushToken,
        platform: Platform.OS,
        device_name: Device.default.deviceName ?? 'Unknown',
      }),
    });
  } catch {
    // Non-critical — will retry on next app open
  }
}

/**
 * Schedule a local notification (e.g., sync complete).
 */
export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Immediate
  });
}

/**
 * Add listeners for notification events.
 * Returns cleanup function.
 */
export function addNotificationListeners(handlers: {
  onReceived?: (notification: Notifications.Notification) => void;
  onTapped?: (response: Notifications.NotificationResponse) => void;
}): () => void {
  const subs: Notifications.Subscription[] = [];

  if (handlers.onReceived) {
    subs.push(Notifications.addNotificationReceivedListener(handlers.onReceived));
  }

  if (handlers.onTapped) {
    subs.push(Notifications.addNotificationResponseReceivedListener(handlers.onTapped));
  }

  return () => {
    for (const sub of subs) {
      sub.remove();
    }
  };
}
