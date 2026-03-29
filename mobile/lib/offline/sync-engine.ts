/**
 * Sync engine for mobile: processes the offline queue when connectivity returns.
 *
 * SAME logic as lib/offline/sync-engine.ts (web).
 * Uses the SQLite store instead of IndexedDB.
 *
 * Lifecycle:
 * 1. Dequeue all 'pending' items (oldest first)
 * 2. For each: mark 'syncing' -> call API -> mark 'synced' or 'failed'
 * 3. On conflict (409): fetch server version, apply conflict strategy
 * 4. On failure: exponential backoff, max 3 retries, then dead-letter
 */

import { API_BASE_URL } from '@/constants/config';
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

/** Sync batch size */
const BATCH_SIZE = 10;

let isSyncing = false;
let lastSyncAt: string | null = null;

/** Token getter injected by the app shell */
let _getToken: (() => Promise<string | null>) | null = null;

/** Initialize auth for sync — call from app _layout.tsx */
export function initSyncAuth(
  getToken: () => Promise<string | null>,
): void {
  _getToken = getToken;
}

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
 * Process the entire offline queue.
 */
export async function processQueue(): Promise<SyncResult[]> {
  if (isSyncing) return [];
  if (!getOnlineState()) return [];

  isSyncing = true;
  const allResults: SyncResult[] = [];

  try {
    let pending = await getItemsByStatus('pending');

    while (pending.length > 0 && getOnlineState()) {
      const batch = pending.slice(0, BATCH_SIZE);

      for (const item of batch) {
        if (!getOnlineState()) break;
        const result = await processItem(item);
        allResults.push(result);
      }

      pending = await getItemsByStatus('pending');
    }

    if (allResults.some((r) => r.success)) {
      await clearSyncedItems();
      lastSyncAt = new Date().toISOString();
    }

    for (const cb of syncListeners) {
      cb(allResults);
    }

    return allResults;
  } finally {
    isSyncing = false;
  }
}

async function processItem(item: OfflineQueueItem): Promise<SyncResult> {
  if (item.id === undefined) {
    return { item_id: 0, success: false, error: 'Item has no id' };
  }

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

    if (response.status === 409) {
      return handleConflict(item);
    }

    return handleFailure(
      item,
      `API error: ${response.status} ${response.statusText}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, message);
  }
}

async function callApi(item: OfflineQueueItem): Promise<Response> {
  const projectId = String(item.payload.project_id ?? '');
  const basePath = ENTITY_API_ENDPOINTS[item.entity_type](projectId);
  let url = `${API_BASE_URL}${basePath}`;
  let method: string;

  switch (item.action) {
    case 'create':
      method = 'POST';
      break;
    case 'update':
      method = 'PATCH';
      url = `${url}/${item.entity_id}`;
      break;
    case 'delete':
      method = 'DELETE';
      url = `${url}/${item.entity_id}`;
      break;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await _getToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(url, {
    method,
    headers,
    body: method !== 'DELETE' ? JSON.stringify(item.payload) : undefined,
  });
}

async function handleConflict(item: OfflineQueueItem): Promise<SyncResult> {
  if (item.id === undefined) {
    return { item_id: 0, success: false, error: 'Item has no id' };
  }

  try {
    const projectId = String(item.payload.project_id ?? '');
    const basePath = ENTITY_API_ENDPOINTS[item.entity_type](projectId);
    const headers: Record<string, string> = {};
    const token = await _getToken?.();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const serverResponse = await fetch(
      `${API_BASE_URL}${basePath}/${item.entity_id}`,
      { headers },
    );

    if (!serverResponse.ok) {
      return handleFailure(
        item,
        'Could not fetch server state for conflict resolution',
      );
    }

    const serverData = (await serverResponse.json()) as Record<string, unknown>;
    const serverVersion = Number(serverData.version ?? 0);

    const resolution = resolveConflict(item, serverData, serverVersion);

    if (!resolution.auto_resolved) {
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, `Conflict handling error: ${message}`);
  }
}

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
 */
export function startAutoSync(): () => void {
  return subscribeOnline((isOnline) => {
    if (isOnline) {
      void processQueue();
    }
  });
}
