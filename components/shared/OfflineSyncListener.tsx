'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

import { initSyncAuth, processQueue } from '@/lib/offline/sync-engine';

/**
 * Listens for OFFLINE_SYNC_TRIGGER messages from the service worker
 * and kicks off the sync engine. Mount once in the dashboard layout.
 */
export function OfflineSyncListener() {
  const { getToken } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize auth for the sync engine
    initSyncAuth(() => getToken());

    // Listen for service worker sync messages
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'OFFLINE_SYNC_TRIGGER') {
        processQueue().catch(() => {
          // Sync errors are logged inside processQueue — no action needed here
        });
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [getToken]);

  // Also sync on reconnect
  useEffect(() => {
    function handleOnline() {
      processQueue().catch(() => {});
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
