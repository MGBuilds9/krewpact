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

import { resolveConflict } from './conflict-resolver';
import { getOnlineState, subscribe as subscribeOnline } from './online-detector';
import {
  clearSyncedItems,
  getItem,
  getItemsByStatus,
  updateItem,
} from './store';
import type { OfflineQueueItem, SyncResult } from './types';
import { ENTITY_API_ENDPOINTS } from './types';

/** Maximum retry attempts before dead-lettering */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const BASE_BACKOFF_MS = 1000;

/** Sync batch size — process N items at a time */
const BATCH_SIZE = 10;

let isSyncing = false;
let lastSyncAt: string | null = null;

type SyncEventCallback = (results: SyncResult[]) => void;
const syncListeners = new Set<SyncEventCallback>();

/** Subscribe to sync completion events */
export function onSyncComplete(
  cb: SyncEventCallback,
): () => void {
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
 * Process the entire offline queue.
 * Items are processed in FIFO order (oldest first).
 * Returns results for all processed items.
 */
export async function processQueue(): Promise<SyncResult[]> {
  if (isSyncing) return [];
  if (!getOnlineState()) return [];

  isSyncing = true;
  const allResults: SyncResult[] = [];

  try {
    // Process in batches to avoid overwhelming the API
    let pending = await getItemsByStatus('pending');

    while (pending.length > 0 && getOnlineState()) {
      const batch = pending.slice(0, BATCH_SIZE);

      for (const item of batch) {
        if (!getOnlineState()) break;
        const result = await processItem(item);
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
 * Process a single queue item.
 * Handles the full lifecycle: syncing → API call → synced/failed.
 */
async function processItem(
  item: OfflineQueueItem,
): Promise<SyncResult> {
  if (item.id === undefined) {
    return { item_id: 0, success: false, error: 'Item has no id' };
  }

  // Mark as syncing
  item.status = 'syncing';
  item.last_attempted_at = new Date().toISOString();
  await updateItem(item);

  try {
    const response = await callApi(item);

    if (response.ok) {
      item.status = 'synced';
      await updateItem(item);
      const data = await safeParseJson(response);
      return {
        item_id: item.id,
        success: true,
        server_version: typeof data?.version === 'number' ? data.version : undefined,
      };
    }

    // Conflict: server has a newer version
    if (response.status === 409) {
      return handleConflict(item);
    }

    // Other API error
    return handleFailure(
      item,
      `API error: ${response.status} ${response.statusText}`,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, message);
  }
}

/**
 * Make the actual API call for a queue item.
 */
async function callApi(item: OfflineQueueItem): Promise<Response> {
  const projectId = String(item.payload.project_id ?? '');
  const basePath = ENTITY_API_ENDPOINTS[item.entity_type](projectId);
  let url = basePath;
  let method: string;

  switch (item.action) {
    case 'create':
      method = 'POST';
      break;
    case 'update':
      method = 'PATCH';
      url = `${basePath}/${item.entity_id}`;
      break;
    case 'delete':
      method = 'DELETE';
      url = `${basePath}/${item.entity_id}`;
      break;
  }

  return fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body:
      method !== 'DELETE'
        ? JSON.stringify(item.payload)
        : undefined,
  });
}

/**
 * Handle a 409 conflict response.
 * Fetches the current server state and applies the conflict strategy.
 */
async function handleConflict(
  item: OfflineQueueItem,
): Promise<SyncResult> {
  if (item.id === undefined) {
    return {
      item_id: 0,
      success: false,
      error: 'Item has no id',
    };
  }

  try {
    const projectId = String(item.payload.project_id ?? '');
    const basePath = ENTITY_API_ENDPOINTS[item.entity_type](projectId);
    const serverResponse = await fetch(
      `${basePath}/${item.entity_id}`,
      { credentials: 'include' },
    );

    if (!serverResponse.ok) {
      return handleFailure(
        item,
        'Could not fetch server state for conflict resolution',
      );
    }

    const serverData = (await serverResponse.json()) as Record<
      string,
      unknown
    >;
    const serverVersion = Number(serverData.version ?? 0);

    const resolution = resolveConflict(
      item,
      serverData,
      serverVersion,
    );

    if (!resolution.auto_resolved) {
      // Cannot auto-resolve — dead-letter for manual review
      item.status = 'dead_letter';
      item.last_error = resolution.resolution_note;
      await updateItem(item);
      return {
        item_id: item.id,
        success: false,
        error: resolution.resolution_note,
        conflict_resolved: false,
      };
    }

    // Apply the resolved payload
    const resolvedItem: OfflineQueueItem = {
      ...item,
      payload: resolution.resolved_payload,
      action: resolution.create_new ? 'create' : item.action,
      entity_id: resolution.create_new ? '' : item.entity_id,
    };

    const retryResponse = await callApi(resolvedItem);

    if (retryResponse.ok) {
      item.status = 'synced';
      await updateItem(item);
      const data = await safeParseJson(retryResponse);
      return {
        item_id: item.id,
        success: true,
        server_version: typeof data?.version === 'number' ? data.version : undefined,
        conflict_resolved: true,
      };
    }

    return handleFailure(
      item,
      `Conflict resolution retry failed: ${retryResponse.status}`,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, `Conflict handling error: ${message}`);
  }
}

/**
 * Handle a failed sync attempt.
 * Implements exponential backoff with max retries.
 * After MAX_RETRIES, moves to dead_letter.
 */
async function handleFailure(
  item: OfflineQueueItem,
  error: string,
): Promise<SyncResult> {
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

/** Safely parse JSON from a response, returning null on failure */
async function safeParseJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
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
