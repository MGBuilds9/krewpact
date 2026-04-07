/**
 * IndexedDB store for offline queue items.
 *
 * Uses the `idb` library for a clean Promise-based API.
 * Designed to be the sole persistence layer for offline mutations.
 * Phase 4 (Mobile) will swap this for a SQLite-backed store with
 * the same interface.
 */

import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';

import type {
  OfflineAction,
  OfflineEntityType,
  OfflineQueueItem,
  OfflineQueueStatus,
  StorageQuota,
} from './types';

const DB_NAME = 'krewpact-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

/** Quota thresholds */
const QUOTA_WARN_PERCENT = 80;
const QUOTA_BLOCK_PERCENT = 95;

interface OfflineDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: OfflineQueueItem;
    indexes: {
      'by-status': OfflineQueueStatus;
      'by-entity': [OfflineEntityType, string];
      'by-created': string;
    };
  };
}

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

/**
 * Get or create the IndexedDB database instance.
 * Singleton pattern — one connection per page lifecycle.
 */
export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-status', 'status');
      store.createIndex('by-entity', ['entity_type', 'entity_id']);
      store.createIndex('by-created', 'created_at');
    },
  });

  return dbInstance;
}

/**
 * Add a new item to the offline queue.
 * Checks storage quota before writing.
 */
interface AddToQueueParams {
  entity_type: OfflineEntityType;
  entity_id: string;
  action: OfflineAction;
  payload: Record<string, unknown>;
  version?: number;
}

export async function addToQueue(params: AddToQueueParams): Promise<number> {
  const { entity_type, entity_id, action, payload, version = 0 } = params;
  const quota = await getStorageQuota();
  if (quota.percent_used >= QUOTA_BLOCK_PERCENT) {
    throw new Error(
      `Storage quota exceeded (${quota.percent_used.toFixed(1)}%). ` +
        'Clear synced items or free device storage.',
    );
  }

  const db = await getDB();
  const item: OfflineQueueItem = {
    entity_type,
    entity_id,
    action,
    payload,
    status: 'pending',
    retry_count: 0,
    version,
    created_at: new Date().toISOString(),
  };

  const id = await db.add(STORE_NAME, item);
  return id;
}

/** Get all items from the queue */
export async function getAllItems(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/** Get items filtered by status */
export async function getItemsByStatus(status: OfflineQueueStatus): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-status', status);
}

/** Get a single item by ID */
export async function getItem(id: number): Promise<OfflineQueueItem | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/** Get items for a specific entity (for conflict detection) */
export async function getItemsByEntity(
  entity_type: OfflineEntityType,
  entity_id: string,
): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-entity', [entity_type, entity_id]);
}

/** Update an existing queue item */
export async function updateItem(item: OfflineQueueItem): Promise<void> {
  if (item.id === undefined) {
    throw new Error('Cannot update item without id');
  }
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

/** Delete a queue item by ID */
export async function deleteItem(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Clear all synced items from the queue.
 * Called after successful batch sync to reclaim storage.
 */
export async function clearSyncedItems(): Promise<number> {
  const db = await getDB();
  const synced = await db.getAllFromIndex(STORE_NAME, 'by-status', 'synced');
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const item of synced) {
    if (item.id !== undefined) {
      await tx.store.delete(item.id);
    }
  }
  await tx.done;
  return synced.length;
}

/** Count items by status (for sync status display) */
export async function countByStatus(): Promise<Record<OfflineQueueStatus, number>> {
  const items = await getAllItems();
  const counts: Record<OfflineQueueStatus, number> = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    dead_letter: 0,
  };
  for (const item of items) {
    counts[item.status]++;
  }
  return counts;
}

/**
 * Get current storage quota usage.
 *
 * Uses the StorageManager API where available.
 * Falls back to a conservative estimate on unsupported browsers.
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage ?? 0;
    const available = estimate.quota ?? 0;
    const percent_used = available > 0 ? (used / available) * 100 : 0;
    return { used, available, percent_used };
  }

  // Fallback: assume 50MB available, calculate from item count
  const items = await getAllItems();
  const estimatedBytes = items.length * 2048; // ~2KB per item
  const available = 50 * 1024 * 1024;
  return {
    used: estimatedBytes,
    available,
    percent_used: (estimatedBytes / available) * 100,
  };
}

/**
 * Check if storage quota is in warning zone.
 * Returns 'ok' | 'warning' | 'blocked'.
 */
export async function checkQuotaHealth(): Promise<'ok' | 'warning' | 'blocked'> {
  const quota = await getStorageQuota();
  if (quota.percent_used >= QUOTA_BLOCK_PERCENT) return 'blocked';
  if (quota.percent_used >= QUOTA_WARN_PERCENT) return 'warning';
  return 'ok';
}

/** Close the database connection (for cleanup in tests) */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
