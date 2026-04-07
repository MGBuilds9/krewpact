'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { addToQueue, countByStatus, getItemsByStatus } from '@/lib/offline/store';
import { processQueue, startAutoSync } from '@/lib/offline/sync-engine';
import type {
  OfflineAction,
  OfflineEntityType,
  OfflineQueueItem,
  OfflineQueueStatus,
} from '@/lib/offline/types';

import { useOnlineStatus } from './useOnlineStatus';

interface EnqueueParams {
  entityType: OfflineEntityType;
  entityId: string;
  action: OfflineAction;
  payload: Record<string, unknown>;
  version?: number;
}

interface UseOfflineQueueReturn {
  /** Enqueue a mutation for offline sync */
  enqueue: (params: EnqueueParams) => Promise<number>;
  /** Trigger manual sync */
  syncNow: () => Promise<void>;
  /** Current queue counts by status */
  counts: Record<OfflineQueueStatus, number>;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Dead-lettered items that need manual review */
  deadLetterItems: OfflineQueueItem[];
  /** Refresh counts and dead-letter items */
  refresh: () => Promise<void>;
}

/**
 * Hook to enqueue offline mutations and monitor queue status.
 *
 * Automatically starts the sync engine on mount and triggers
 * sync when connectivity returns.
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const { isOnline } = useOnlineStatus();
  const [counts, setCounts] = useState<Record<OfflineQueueStatus, number>>({
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    dead_letter: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [deadLetterItems, setDeadLetterItems] = useState<OfflineQueueItem[]>([]);
  const autoSyncCleanup = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    const newCounts = await countByStatus();
    setCounts(newCounts);
    const deadLetters = await getItemsByStatus('dead_letter');
    setDeadLetterItems(deadLetters);
  }, []);

  // Start auto-sync on mount
  useEffect(() => {
    autoSyncCleanup.current = startAutoSync();
    void refresh();
    return () => {
      autoSyncCleanup.current?.();
    };
  }, [refresh]);

  // Refresh counts when online status changes
  useEffect(() => {
    void refresh();
  }, [isOnline, refresh]);

  const enqueue = useCallback(
    async (params: EnqueueParams): Promise<number> => {
      const id = await addToQueue({
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        payload: params.payload,
        version: params.version,
      });
      await refresh();
      return id;
    },
    [refresh],
  );

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await processQueue();
    } finally {
      setIsSyncing(false);
      await refresh();
    }
  }, [refresh]);

  return {
    enqueue,
    syncNow,
    counts,
    isSyncing,
    deadLetterItems,
    refresh,
  };
}
