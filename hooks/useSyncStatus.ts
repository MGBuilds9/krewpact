'use client';

import { useEffect, useState } from 'react';

import { countByStatus } from '@/lib/offline/store';
import {
  getIsSyncing,
  getLastSyncAt,
  onSyncComplete,
} from '@/lib/offline/sync-engine';
import type { SyncStatus } from '@/lib/offline/types';

/**
 * Hook for displaying sync status in the UI.
 *
 * Provides pending count, last sync time, conflict count, and
 * whether the engine is actively syncing. Updates on sync events.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    pending_count: 0,
    syncing_count: 0,
    failed_count: 0,
    dead_letter_count: 0,
    last_sync_at: null,
    is_syncing: false,
  });

  useEffect(() => {
    async function updateStatus(): Promise<void> {
      const counts = await countByStatus();
      setStatus({
        pending_count: counts.pending,
        syncing_count: counts.syncing,
        failed_count: counts.failed,
        dead_letter_count: counts.dead_letter,
        last_sync_at: getLastSyncAt(),
        is_syncing: getIsSyncing(),
      });
    }

    void updateStatus();

    // Re-compute after each sync completes
    const unsub = onSyncComplete(() => {
      void updateStatus();
    });

    // Poll every 5 seconds for status changes
    const interval = setInterval(() => {
      void updateStatus();
    }, 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return status;
}
