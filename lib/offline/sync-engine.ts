/**
 * Sync engine: processes the offline queue when connectivity returns.
 *
 * Lifecycle:
 * 1. Dequeue all 'pending' items (oldest first)
 * 2. For each: mark 'syncing' → call API → mark 'synced' or 'failed'
 * 3. On conflict (409): fetch server version, apply conflict strategy
 * 4. On failure: exponential backoff, max 3 retries, then dead-letter
 *
 * The engine is designed to be called from:
 * - The React hook (on reconnect)
 * - The service worker (BackgroundSync)
 * - Manual trigger (user taps "Sync Now")
 */

import { getOnlineState, subscribe as subscribeOnline } from './online-detector';
import { clearSyncedItems, getItem, getItemsByStatus, updateItem } from './store';
import { handleConflict } from './sync-conflict-handler';
import {
  BASE_BACKOFF_MS,
  callApi,
  MAX_RETRIES,
  processItem,
  setTokenGetter,
} from './sync-processor';
import type { OfflineQueueItem, SyncResult } from './types';

/** Token getter injected by the app shell */
let _getToken: (() => Promise<string | null>) | null = null;

/** Initialize auth for sync — call from a layout or provider component */
export function initSyncAuth(getToken: () => Promise<string | null>): void {
  _getToken = getToken;
  setTokenGetter(getToken);
}

/** Sync batch size — process N items at a time */
const BATCH_SIZE = 10;

let isSyncing = false;
let lastSyncAt: string | null = null;

type SyncEventCallback = (results: SyncResult[]) => void;
const syncListeners = new Set<SyncEventCallback>();

/** Subscribe to sync completion events */
export function onSyncComplete(cb: SyncEventCallback): () => void {
  syncListeners.add(cb);
  return () => {
    syncListeners.delete(cb);
  };
}

/** Get whether the engine is currently syncing */
export function getIsSyncing(): boolean {
  return isSyncing;
}

/** Get the timestamp of the last successful sync */
export function getLastSyncAt(): string | null {
  return lastSyncAt;
}

/**
 * Handle a failed sync attempt.
 * Implements exponential backoff with max retries.
 * After MAX_RETRIES, moves to dead_letter.
 */
async function handleFailure(item: OfflineQueueItem, error: string): Promise<SyncResult> {
  if (item.id === undefined) {
    return { item_id: 0, success: false, error };
  }

  item.retry_count++;
  item.last_error = error;

  if (item.retry_count >= MAX_RETRIES) {
    item.status = 'dead_letter';
    await updateItem(item);
    return {
      item_id: item.id,
      success: false,
      error: `Dead-lettered after ${MAX_RETRIES} retries: ${error}`,
    };
  }

  item.status = 'failed';
  await updateItem(item);

  // Schedule retry with exponential backoff
  const delay = BASE_BACKOFF_MS * 2 ** (item.retry_count - 1);
  setTimeout(async () => {
    const freshItem = await getItem(item.id!);
    if (freshItem && freshItem.status === 'failed') {
      freshItem.status = 'pending';
      await updateItem(freshItem);
    }
  }, delay);

  return { item_id: item.id, success: false, error };
}

/**
 * Process the entire offline queue.
 * Items are processed in FIFO order (oldest first).
 * Returns results for all processed items.
 */
export async function processQueue(): Promise<SyncResult[]> {
  if (isSyncing) return [];
  if (!getOnlineState()) return [];

  isSyncing = true;
  const allResults: SyncResult[] = [];

  const conflictFn = (item: OfflineQueueItem) =>
    handleConflict(item, () => _getToken?.() ?? Promise.resolve(null), callApi, handleFailure);

  try {
    // Process in batches to avoid overwhelming the API
    let pending = await getItemsByStatus('pending');

    while (pending.length > 0 && getOnlineState()) {
      const batch = pending.slice(0, BATCH_SIZE);

      for (const item of batch) {
        if (!getOnlineState()) break;
        const result = await processItem(item, conflictFn, handleFailure);
        allResults.push(result);
      }

      // Re-fetch in case new items were added during processing
      pending = await getItemsByStatus('pending');
    }

    // Clean up synced items
    if (allResults.some((r) => r.success)) {
      await clearSyncedItems();
      lastSyncAt = new Date().toISOString();
    }

    // Notify listeners
    for (const cb of syncListeners) {
      cb(allResults);
    }

    return allResults;
  } finally {
    isSyncing = false;
  }
}

/**
 * Start automatic sync on reconnect.
 * Subscribes to online state changes and triggers processQueue.
 * Returns an unsubscribe function.
 */
export function startAutoSync(): () => void {
  return subscribeOnline((isOnline) => {
    if (isOnline) {
      void processQueue();
    }
  });
}
