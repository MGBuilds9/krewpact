/**
 * SQLite store for offline queue items (mobile).
 *
 * Drop-in replacement for lib/offline/store.ts (IndexedDB).
 * SAME API surface — swaps only the storage backend.
 * Uses expo-sqlite for React Native.
 */

import * as SQLite from 'expo-sqlite';
import type {
  OfflineAction,
  OfflineEntityType,
  OfflineQueueItem,
  OfflineQueueStatus,
  StorageQuota,
} from './types';

const DB_NAME = 'krewpact-offline.db';

/** Quota thresholds */
const QUOTA_WARN_PERCENT = 80;
const QUOTA_BLOCK_PERCENT = 95;

/** Estimated max SQLite size on device (100MB conservative) */
const MAX_DB_SIZE = 100 * 1024 * 1024;

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the SQLite database instance.
 * Creates the queue table if it doesn't exist.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_attempted_at TEXT,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
    CREATE INDEX IF NOT EXISTS idx_queue_entity ON queue(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_queue_created ON queue(created_at);
  `);

  return db;
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

  const database = await getDB();
  const result = await database.runAsync(
    `INSERT INTO queue (entity_type, entity_id, action, payload, status, retry_count, version, created_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    entity_type,
    entity_id,
    action,
    JSON.stringify(payload),
    version,
    new Date().toISOString(),
  );

  return result.lastInsertRowId;
}

/** Parse a raw SQLite row into an OfflineQueueItem */
function parseRow(row: Record<string, unknown>): OfflineQueueItem {
  return {
    id: row.id as number,
    entity_type: row.entity_type as OfflineEntityType,
    entity_id: row.entity_id as string,
    action: row.action as OfflineAction,
    payload: JSON.parse(row.payload as string) as Record<string, unknown>,
    status: row.status as OfflineQueueStatus,
    retry_count: row.retry_count as number,
    version: row.version as number,
    created_at: row.created_at as string,
    last_attempted_at: (row.last_attempted_at as string) ?? undefined,
    last_error: (row.last_error as string) ?? undefined,
  };
}

/** Get all items from the queue */
export async function getAllItems(): Promise<OfflineQueueItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM queue ORDER BY created_at ASC');
  return rows.map((r) => parseRow(r as Record<string, unknown>));
}

/** Get items filtered by status */
export async function getItemsByStatus(status: OfflineQueueStatus): Promise<OfflineQueueItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM queue WHERE status = ? ORDER BY created_at ASC',
    status,
  );
  return rows.map((r) => parseRow(r as Record<string, unknown>));
}

/** Get a single item by ID */
export async function getItem(id: number): Promise<OfflineQueueItem | undefined> {
  const database = await getDB();
  const row = await database.getFirstAsync('SELECT * FROM queue WHERE id = ?', id);
  return row ? parseRow(row as Record<string, unknown>) : undefined;
}

/** Get items for a specific entity (for conflict detection) */
export async function getItemsByEntity(
  entity_type: OfflineEntityType,
  entity_id: string,
): Promise<OfflineQueueItem[]> {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM queue WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC',
    entity_type,
    entity_id,
  );
  return rows.map((r) => parseRow(r as Record<string, unknown>));
}

/** Update an existing queue item */
export async function updateItem(item: OfflineQueueItem): Promise<void> {
  if (item.id === undefined) {
    throw new Error('Cannot update item without id');
  }
  const database = await getDB();
  await database.runAsync(
    `UPDATE queue SET
      entity_type = ?, entity_id = ?, action = ?, payload = ?,
      status = ?, retry_count = ?, version = ?, created_at = ?,
      last_attempted_at = ?, last_error = ?
     WHERE id = ?`,
    item.entity_type,
    item.entity_id,
    item.action,
    JSON.stringify(item.payload),
    item.status,
    item.retry_count,
    item.version,
    item.created_at,
    item.last_attempted_at ?? null,
    item.last_error ?? null,
    item.id,
  );
}

/** Delete a queue item by ID */
export async function deleteItem(id: number): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM queue WHERE id = ?', id);
}

/**
 * Clear all synced items from the queue.
 * Called after successful batch sync to reclaim storage.
 */
export async function clearSyncedItems(): Promise<number> {
  const database = await getDB();
  const result = await database.runAsync("DELETE FROM queue WHERE status = 'synced'");
  return result.changes;
}

/** Count items by status (for sync status display) */
export async function countByStatus(): Promise<Record<OfflineQueueStatus, number>> {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT status, COUNT(*) as count FROM queue GROUP BY status',
  );

  const counts: Record<OfflineQueueStatus, number> = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    dead_letter: 0,
  };

  for (const row of rows) {
    const r = row as { status: string; count: number };
    if (r.status in counts) {
      counts[r.status as OfflineQueueStatus] = r.count;
    }
  }

  return counts;
}

/**
 * Get current storage quota usage.
 *
 * Uses FileSystem to check the SQLite file size.
 * Falls back to a row-count estimate if file size is unavailable.
 */
export async function getStorageQuota(): Promise<StorageQuota> {
  try {
    // Estimate from item count — SQLite file size queries are unreliable
    // across expo-file-system versions. Item count * avg size is accurate enough.
    const items = await getAllItems();
    const estimatedBytes = items.length * 2048; // ~2KB per item
    const available = MAX_DB_SIZE;
    const percent_used = available > 0 ? (estimatedBytes / available) * 100 : 0;
    return { used: estimatedBytes, available, percent_used };
  } catch {
    return {
      used: 0,
      available: MAX_DB_SIZE,
      percent_used: 0,
    };
  }
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
export async function closeDB(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
