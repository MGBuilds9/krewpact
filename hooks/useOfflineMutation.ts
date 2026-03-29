'use client';

import { useCallback } from 'react';

import type { OfflineAction, OfflineEntityType } from '@/lib/offline/types';

import { useOfflineQueue } from './useOfflineQueue';
import { useOnlineStatus } from './useOnlineStatus';

interface OfflineMutationOptions<T> {
  /** Entity type for queue routing */
  entityType: OfflineEntityType;
  /** The API call to attempt when online */
  mutationFn: (payload: T) => Promise<Record<string, unknown>>;
  /** Extract entity ID from the payload (empty string for creates) */
  getEntityId?: (payload: T) => string;
  /** CRUD action */
  action: OfflineAction;
  /** Current entity version (for conflict detection) */
  version?: number;
}

interface OfflineMutationResult<T> {
  /** Execute the mutation — online: calls API, offline: enqueues */
  mutate: (payload: T) => Promise<{
    /** Whether the mutation was sent to the API (true) or queued (false) */
    online: boolean;
    /** API response data (only when online) */
    data?: Record<string, unknown>;
    /** Queue item ID (only when offline) */
    queue_id?: number;
  }>;
}

/**
 * Offline-aware mutation wrapper.
 *
 * When online: calls the API directly.
 * When offline: enqueues the mutation in IndexedDB for later sync.
 *
 * Usage:
 * ```ts
 * const { mutate } = useOfflineMutation({
 *   entityType: 'daily_logs',
 *   action: 'create',
 *   mutationFn: (data) => apiFetch('/api/projects/daily-logs', {
 *     method: 'POST', body: JSON.stringify(data),
 *   }),
 * });
 * const result = await mutate({ project_id: '...', notes: '...' });
 * ```
 */
export function useOfflineMutation<
  T extends Record<string, unknown>,
>(options: OfflineMutationOptions<T>): OfflineMutationResult<T> {
  const { isOnline } = useOnlineStatus();
  const { enqueue } = useOfflineQueue();

  const mutate = useCallback(
    async (payload: T) => {
      const entityId = options.getEntityId?.(payload) ?? '';
      const enqueueParams = {
        entityType: options.entityType,
        entityId,
        action: options.action,
        payload,
        version: options.version,
      };

      if (isOnline) {
        try {
          const data = await options.mutationFn(payload);
          return { online: true, data };
        } catch {
          // API call failed while "online" — queue it
          const queueId = await enqueue(enqueueParams);
          return { online: false, queue_id: queueId };
        }
      }

      // Offline: enqueue directly
      const queueId = await enqueue(enqueueParams);
      return { online: false, queue_id: queueId };
    },
    [isOnline, enqueue, options],
  );

  return { mutate };
}
