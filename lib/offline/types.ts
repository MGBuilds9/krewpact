/**
 * Offline queue types for IndexedDB-based offline sync.
 *
 * These types are designed to be portable — Phase 4 (Mobile Expo)
 * will reuse these interfaces with a SQLite backend.
 */

/** Entity types that support offline mutations */
export type OfflineEntityType =
  | 'daily_logs'
  | 'time_entries'
  | 'safety_forms'
  | 'photos';

/** CRUD actions that can be queued */
export type OfflineAction = 'create' | 'update' | 'delete';

/** Queue item lifecycle status */
export type OfflineQueueStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'dead_letter';

/** Conflict resolution strategies */
export type ConflictStrategy =
  | 'last_write_wins'
  | 'merge'
  | 'always_keep_both';

/**
 * A single queued offline mutation.
 *
 * Stored in IndexedDB. Processed by the SyncEngine when online.
 */
export interface OfflineQueueItem {
  /** Auto-incremented IndexedDB key */
  id?: number;
  /** Which entity table this mutation targets */
  entity_type: OfflineEntityType;
  /** UUID of the entity being mutated (empty string for creates) */
  entity_id: string;
  /** CRUD action */
  action: OfflineAction;
  /** The mutation payload (request body) */
  payload: Record<string, unknown>;
  /** Current lifecycle status */
  status: OfflineQueueStatus;
  /** Number of sync attempts so far */
  retry_count: number;
  /** Entity version at time of queue (for conflict detection) */
  version: number;
  /** ISO timestamp when queued */
  created_at: string;
  /** ISO timestamp of last sync attempt */
  last_attempted_at?: string;
  /** Error message from last failed attempt */
  last_error?: string;
}

/** Result of a sync attempt for a single item */
export interface SyncResult {
  item_id: number;
  success: boolean;
  /** Server version after sync (for version tracking) */
  server_version?: number;
  error?: string;
  /** Whether this was a conflict that was resolved */
  conflict_resolved?: boolean;
}

/** Storage quota information */
export interface StorageQuota {
  /** Bytes used */
  used: number;
  /** Bytes available (estimated) */
  available: number;
  /** Percentage used (0-100) */
  percent_used: number;
}

/** Aggregate sync status for UI display */
export interface SyncStatus {
  /** Number of items waiting to sync */
  pending_count: number;
  /** Number of items currently syncing */
  syncing_count: number;
  /** Number of items that failed (not yet dead-lettered) */
  failed_count: number;
  /** Number of dead-lettered items requiring manual review */
  dead_letter_count: number;
  /** ISO timestamp of last successful sync */
  last_sync_at: string | null;
  /** Whether the sync engine is currently processing */
  is_syncing: boolean;
}

/** Map entity types to their conflict resolution strategy */
export const CONFLICT_STRATEGIES: Record<OfflineEntityType, ConflictStrategy> = {
  daily_logs: 'last_write_wins',
  time_entries: 'merge',
  safety_forms: 'last_write_wins',
  photos: 'always_keep_both',
};

/** API endpoint map for each entity type */
export const ENTITY_API_ENDPOINTS: Record<OfflineEntityType, string> = {
  daily_logs: '/api/projects/daily-logs',
  time_entries: '/api/projects/time-entries',
  safety_forms: '/api/safety/forms',
  photos: '/api/projects/photos',
};
