'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  forceCheck,
  getOnlineState,
  startMonitoring,
  stopMonitoring,
  subscribe,
} from '@/lib/offline/online-detector';

/**
 * Reactive online/offline status hook.
 *
 * Combines navigator.onLine with periodic heartbeat pings
 * for accurate connectivity detection on construction sites.
 *
 * @returns {{ isOnline: boolean, checkNow: () => Promise<boolean> }}
 */
export function useOnlineStatus() {
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const isOnline = useSyncExternalStore(
    subscribe,
    getOnlineState,
    () => true, // SSR always assumes online
  );

  const checkNow = useCallback(() => forceCheck(), []);

  return { isOnline, checkNow };
}
