import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';
import { COLORS } from '@/constants/config';
import { startMonitoring, stopMonitoring } from '@/lib/offline/online-detector';
import { initSyncAuth, startAutoSync } from '@/lib/offline/sync-engine';
import { registerBackgroundSync } from '@/lib/offline/background-sync';
import { registerForPushNotifications, addNotificationListeners } from '@/lib/notifications';

function useProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoaded, segments, router]);
}

function InnerLayout() {
  const { isLoaded, getToken } = useAuth();
  useProtectedRoute();

  // Wire Clerk token into offline sync engine
  useEffect(() => {
    initSyncAuth(getToken);
  }, [getToken]);

  // Initialize offline sync, background fetch, and notifications
  useEffect(() => {
    // Online/offline monitoring
    startMonitoring();
    const unsubAutoSync = startAutoSync();

    // Background sync (non-blocking)
    void registerBackgroundSync();

    // Push notifications (non-blocking)
    void registerForPushNotifications();

    // Notification listeners
    const cleanupNotifications = addNotificationListeners({
      onTapped: (response) => {
        // Handle notification tap — could navigate to relevant screen
        const data = response.notification.request.content.data;
        if (data?.screen) {
          // Future: navigate based on notification data
        }
      },
    });

    return () => {
      stopMonitoring();
      unsubAutoSync();
      cleanupNotifications();
    };
  }, []);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <InnerLayout />
      </QueryClientProvider>
    </AuthProvider>
  );
}
