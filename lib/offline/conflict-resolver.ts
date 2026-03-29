/**
 * Deterministic conflict resolution for offline sync.
 *
 * Each entity type has a strategy:
 * - last_write_wins: Client version overwrites server (daily_logs, safety_forms)
 * - merge: Field-level merge with domain rules (time_entries)
 * - always_keep_both: Creates a new record instead of overwriting (photos)
 *
 * Determinism guarantee: same inputs always produce the same output,
 * regardless of execution order or timing.
 */

import type { OfflineQueueItem } from './types';
import { CONFLICT_STRATEGIES } from './types';

export interface ConflictResult {
  /** The resolved payload to send to the server */
  resolved_payload: Record<string, unknown>;
  /** Whether the conflict was auto-resolved or needs manual review */
  auto_resolved: boolean;
  /** Human-readable description of the resolution */
  resolution_note: string;
  /** Whether to create a new record instead of updating */
  create_new: boolean;
}

/**
 * Resolve a conflict between a local offline mutation and the server state.
 *
 * @param item - The queued offline mutation
 * @param serverData - The current server-side entity state
 * @param serverVersion - The server entity's current version
 * @returns ConflictResult with the resolved payload
 */
export function resolveConflict(
  item: OfflineQueueItem,
  serverData: Record<string, unknown>,
  _serverVersion: number,
): ConflictResult {
  const strategy = CONFLICT_STRATEGIES[item.entity_type];

  switch (strategy) {
    case 'last_write_wins':
      return resolveLastWriteWins(item);
    case 'merge':
      return resolveMerge(item, serverData);
    case 'always_keep_both':
      return resolveKeepBoth(item);
    default:
      return resolveLastWriteWins(item);
  }
}

/**
 * Last-write-wins: client payload overwrites server entirely.
 * Used for: daily_logs (append-only, low conflict risk), safety_forms (atomic).
 */
function resolveLastWriteWins(
  item: OfflineQueueItem,
): ConflictResult {
  return {
    resolved_payload: { ...item.payload },
    auto_resolved: true,
    resolution_note: `${item.entity_type}: client version accepted (last-write-wins)`,
    create_new: false,
  };
}

/**
 * Merge strategy: combine client and server fields intelligently.
 * Used for: time_entries (sum hours if same day/project).
 */
function resolveMerge(
  item: OfflineQueueItem,
  serverData: Record<string, unknown>,
): ConflictResult {
  if (item.entity_type === 'time_entries') {
    return mergeTimeEntries(item, serverData);
  }

  // Generic merge: client fields override server fields
  return {
    resolved_payload: { ...serverData, ...item.payload },
    auto_resolved: true,
    resolution_note:
      `${item.entity_type}: fields merged (client overrides server)`,
    create_new: false,
  };
}

/**
 * Time entry merge: if both modified hours for the same day/project,
 * sum the delta rather than overwriting.
 */
function mergeTimeEntries(
  item: OfflineQueueItem,
  serverData: Record<string, unknown>,
): ConflictResult {
  const clientHours = Number(item.payload.hours ?? 0);
  const serverHours = Number(serverData.hours ?? 0);

  // If both have hours and they differ, sum the client's delta
  if (clientHours > 0 && serverHours > 0) {
    const originalHours = Number(item.payload._original_hours ?? 0);
    const delta = clientHours - originalHours;
    const mergedHours = serverHours + delta;

    const resolved: Record<string, unknown> = {
      ...serverData,
      ...item.payload,
      hours: Math.max(0, mergedHours),
    };
    // Remove internal tracking field
    delete resolved._original_hours;

    return {
      resolved_payload: resolved,
      auto_resolved: true,
      resolution_note:
        `time_entries: hours merged ` +
        `(server=${serverHours}, delta=${delta}, result=${mergedHours})`,
      create_new: false,
    };
  }

  // No hours conflict — simple field merge
  const resolved: Record<string, unknown> = { ...serverData, ...item.payload };
  delete resolved._original_hours;

  return {
    resolved_payload: resolved,
    auto_resolved: true,
    resolution_note: 'time_entries: fields merged (no hours conflict)',
    create_new: false,
  };
}

/**
 * Always keep both: never overwrite or delete user data.
 * Used for: photos (field-captured images are HIGH VALUE).
 * Creates a new record rather than updating the conflicting one.
 */
function resolveKeepBoth(item: OfflineQueueItem): ConflictResult {
  if (item.action === 'delete') {
    // Never silently discard photos — convert delete to a no-op
    return {
      resolved_payload: {},
      auto_resolved: false,
      resolution_note:
        'photos: delete conflict — both versions kept, manual review needed',
      create_new: false,
    };
  }

  return {
    resolved_payload: {
      ...item.payload,
      _offline_duplicate: true,
    },
    auto_resolved: true,
    resolution_note:
      'photos: both versions kept (new record created)',
    create_new: true,
  };
}
