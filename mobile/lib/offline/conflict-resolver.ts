/**
 * Deterministic conflict resolution for offline sync (mobile).
 *
 * IDENTICAL logic to lib/offline/conflict-resolver.ts in the web app.
 * Duplicated here to avoid cross-project imports from the Next.js codebase.
 *
 * Each entity type has a strategy:
 * - last_write_wins: Client version overwrites server (daily_logs, safety_forms)
 * - merge: Field-level merge with domain rules (time_entries)
 * - always_keep_both: Creates a new record instead of overwriting (photos)
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

function resolveLastWriteWins(item: OfflineQueueItem): ConflictResult {
  return {
    resolved_payload: { ...item.payload },
    auto_resolved: true,
    resolution_note: `${item.entity_type}: client version accepted (last-write-wins)`,
    create_new: false,
  };
}

function resolveMerge(
  item: OfflineQueueItem,
  serverData: Record<string, unknown>,
): ConflictResult {
  if (item.entity_type === 'time_entries') {
    return mergeTimeEntries(item, serverData);
  }

  return {
    resolved_payload: { ...serverData, ...item.payload },
    auto_resolved: true,
    resolution_note: `${item.entity_type}: fields merged (client overrides server)`,
    create_new: false,
  };
}

function mergeTimeEntries(
  item: OfflineQueueItem,
  serverData: Record<string, unknown>,
): ConflictResult {
  const clientHours = Number(item.payload.hours ?? 0);
  const serverHours = Number(serverData.hours ?? 0);

  if (clientHours > 0 && serverHours > 0) {
    const originalHours = Number(item.payload._original_hours ?? 0);
    const delta = clientHours - originalHours;
    const mergedHours = serverHours + delta;

    const resolved: Record<string, unknown> = {
      ...serverData,
      ...item.payload,
      hours: Math.max(0, mergedHours),
    };
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

  const resolved: Record<string, unknown> = { ...serverData, ...item.payload };
  delete resolved._original_hours;

  return {
    resolved_payload: resolved,
    auto_resolved: true,
    resolution_note: 'time_entries: fields merged (no hours conflict)',
    create_new: false,
  };
}

function resolveKeepBoth(item: OfflineQueueItem): ConflictResult {
  if (item.action === 'delete') {
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
    resolution_note: 'photos: both versions kept (new record created)',
    create_new: true,
  };
}
