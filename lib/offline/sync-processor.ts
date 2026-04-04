/**
 * Sync processor: handles processing individual sync queue items and making
 * API calls. Called by sync-engine.ts during queue processing.
 */

import { updateItem } from './store';
import type { OfflineQueueItem, SyncResult } from './types';
import { ENTITY_API_ENDPOINTS } from './types';

/** Token getter injected via initSyncAuth in sync-engine.ts */
let _getToken: (() => Promise<string | null>) | null = null;

/** Internal setter — called by sync-engine when auth is initialized */
export function setTokenGetter(fn: (() => Promise<string | null>) | null): void {
  _getToken = fn;
}

/** Maximum retry attempts before dead-lettering */
export const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
export const BASE_BACKOFF_MS = 1000;

/**
 * Process a single queue item.
 * Handles the full lifecycle: syncing → API call → synced/failed.
 */
export async function processItem(
  item: OfflineQueueItem,
  handleConflict: (item: OfflineQueueItem) => Promise<SyncResult>,
  handleFailure: (item: OfflineQueueItem, error: string) => Promise<SyncResult>,
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
    return handleFailure(item, `API error: ${response.status} ${response.statusText}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, message);
  }
}

/**
 * Make the actual API call for a queue item.
 */
export async function callApi(item: OfflineQueueItem): Promise<Response> {
  const projectId = String(item.payload.project_id ?? '');
  if (!projectId || projectId === 'undefined') {
    throw new Error(`Missing project_id for ${item.entity_type} sync item`);
  }
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await _getToken?.();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    credentials: token ? undefined : 'include',
    body: method !== 'DELETE' ? JSON.stringify(item.payload) : undefined,
  });
}

/** Safely parse JSON from a response, returning null on failure */
export async function safeParseJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
