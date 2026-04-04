/**
 * Sync conflict handler: resolves 409 conflicts during offline sync.
 * Called by sync-engine.ts when the API returns a conflict response.
 */

import { resolveConflict } from './conflict-resolver';
import { updateItem } from './store';
import type { OfflineQueueItem, SyncResult } from './types';
import { ENTITY_API_ENDPOINTS } from './types';

/** Handle a 409 conflict: fetch server state, apply strategy, retry. */
export async function handleConflict(
  item: OfflineQueueItem,
  getToken: () => Promise<string | null>,
  callApi: (item: OfflineQueueItem) => Promise<Response>,
  handleFailure: (item: OfflineQueueItem, error: string) => Promise<SyncResult>,
): Promise<SyncResult> {
  if (item.id === undefined) return { item_id: 0, success: false, error: 'Item has no id' };

  try {
    const projectId = String(item.payload.project_id ?? '');
    const basePath = ENTITY_API_ENDPOINTS[item.entity_type](projectId);
    const conflictHeaders: Record<string, string> = {};
    const conflictToken = await getToken();
    if (conflictToken) {
      conflictHeaders['Authorization'] = `Bearer ${conflictToken}`;
    }

    const serverResponse = await fetch(`${basePath}/${item.entity_id}`, {
      headers: conflictHeaders,
      credentials: conflictToken ? undefined : 'include',
    });

    if (!serverResponse.ok) {
      return handleFailure(item, 'Could not fetch server state for conflict resolution');
    }

    const serverData = (await serverResponse.json()) as Record<string, unknown>;
    const serverVersion = Number(serverData.version ?? 0);

    const resolution = resolveConflict(item, serverData, serverVersion);

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

    return handleFailure(item, `Conflict resolution retry failed: ${retryResponse.status}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return handleFailure(item, `Conflict handling error: ${message}`);
  }
}

/** Safely parse JSON from a response, returning null on failure */
async function safeParseJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
