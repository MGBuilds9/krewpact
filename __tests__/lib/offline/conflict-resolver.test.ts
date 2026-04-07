import { describe, expect, it } from 'vitest';

import { resolveConflict } from '@/lib/offline/conflict-resolver';
import type { OfflineQueueItem } from '@/lib/offline/types';

function makeItem(overrides: Partial<OfflineQueueItem> = {}): OfflineQueueItem {
  return {
    id: 1,
    entity_type: 'daily_logs',
    entity_id: 'entity-1',
    action: 'update',
    payload: { notes: 'client notes' },
    status: 'pending',
    retry_count: 0,
    version: 1,
    created_at: '2026-03-29T10:00:00Z',
    ...overrides,
  };
}

describe('Conflict Resolver', () => {
  describe('last_write_wins (daily_logs)', () => {
    it('returns client payload unchanged', () => {
      const item = makeItem({
        entity_type: 'daily_logs',
        payload: { notes: 'field update' },
      });
      const serverData = { notes: 'old notes', version: 2 };

      const result = resolveConflict(item, serverData, 2);

      expect(result.auto_resolved).toBe(true);
      expect(result.resolved_payload).toEqual({ notes: 'field update' });
      expect(result.create_new).toBe(false);
    });

    it('is deterministic — same inputs produce same output', () => {
      const item = makeItem({
        entity_type: 'daily_logs',
        payload: { notes: 'test' },
      });
      const serverData = { notes: 'server', version: 3 };

      const result1 = resolveConflict(item, serverData, 3);
      const result2 = resolveConflict(item, serverData, 3);

      expect(result1).toEqual(result2);
    });
  });

  describe('last_write_wins (safety_forms)', () => {
    it('returns client payload for safety forms', () => {
      const item = makeItem({
        entity_type: 'safety_forms',
        payload: { form_data: { hazard: true } },
      });
      const serverData = { form_data: { hazard: false }, version: 1 };

      const result = resolveConflict(item, serverData, 1);

      expect(result.auto_resolved).toBe(true);
      expect(result.resolved_payload).toEqual({
        form_data: { hazard: true },
      });
    });
  });

  describe('merge (time_entries)', () => {
    it('sums hours delta when both have hours', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: {
          hours: 6,
          _original_hours: 4,
          project_id: 'proj-1',
        },
      });
      const serverData = {
        hours: 5,
        project_id: 'proj-1',
        version: 2,
      };

      const result = resolveConflict(item, serverData, 2);

      // Delta = 6 - 4 = 2, merged = 5 + 2 = 7
      expect(result.auto_resolved).toBe(true);
      expect(result.resolved_payload.hours).toBe(7);
      expect(result.resolved_payload._original_hours).toBeUndefined();
    });

    it('does not produce negative hours', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: {
          hours: 1,
          _original_hours: 10,
          project_id: 'proj-1',
        },
      });
      const serverData = {
        hours: 2,
        project_id: 'proj-1',
        version: 2,
      };

      const result = resolveConflict(item, serverData, 2);

      // Delta = 1 - 10 = -9, merged = 2 + (-9) = -7, clamped to 0
      expect(result.resolved_payload.hours).toBe(0);
    });

    it('merges fields when no hours conflict', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: { description: 'new desc' },
      });
      const serverData = {
        description: 'old desc',
        hours: 3,
        version: 1,
      };

      const result = resolveConflict(item, serverData, 1);

      expect(result.auto_resolved).toBe(true);
      expect(result.resolved_payload.description).toBe('new desc');
      expect(result.resolved_payload.hours).toBe(3);
    });

    it('is deterministic for merge strategy', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: { hours: 8, _original_hours: 4 },
      });
      const serverData = { hours: 6, version: 2 };

      const r1 = resolveConflict(item, serverData, 2);
      const r2 = resolveConflict(item, serverData, 2);

      expect(r1).toEqual(r2);
    });
  });

  describe('always_keep_both (photos)', () => {
    it('creates a new record for update conflicts', () => {
      const item = makeItem({
        entity_type: 'photos',
        action: 'update',
        payload: { url: 'photo.jpg', caption: 'site photo' },
      });
      const serverData = { url: 'photo.jpg', caption: 'old caption' };

      const result = resolveConflict(item, serverData, 2);

      expect(result.auto_resolved).toBe(true);
      expect(result.create_new).toBe(true);
      expect(result.resolved_payload._offline_duplicate).toBe(true);
    });

    it('blocks delete operations and flags for manual review', () => {
      const item = makeItem({
        entity_type: 'photos',
        action: 'delete',
        payload: {},
      });
      const serverData = { url: 'photo.jpg' };

      const result = resolveConflict(item, serverData, 1);

      expect(result.auto_resolved).toBe(false);
      expect(result.create_new).toBe(false);
      expect(result.resolution_note).toContain('manual review');
    });

    it('never silently discards photo data', () => {
      const item = makeItem({
        entity_type: 'photos',
        action: 'create',
        payload: { url: 'new-photo.jpg' },
      });
      const serverData = {};

      const result = resolveConflict(item, serverData, 0);

      expect(result.auto_resolved).toBe(true);
      expect(result.create_new).toBe(true);
    });
  });
});
