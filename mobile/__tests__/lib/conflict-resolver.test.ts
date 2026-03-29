import { resolveConflict } from '@/lib/offline/conflict-resolver';
import type { OfflineQueueItem } from '@/lib/offline/types';

function makeItem(overrides: Partial<OfflineQueueItem> = {}): OfflineQueueItem {
  return {
    id: 1,
    entity_type: 'daily_logs',
    entity_id: 'test-id',
    action: 'update',
    payload: { work_summary: 'local changes' },
    status: 'syncing',
    retry_count: 0,
    version: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('conflict-resolver', () => {
  describe('last_write_wins (daily_logs)', () => {
    it('accepts client version', () => {
      const item = makeItem({ entity_type: 'daily_logs' });
      const serverData = { work_summary: 'server version' };
      const result = resolveConflict(item, serverData, 2);

      expect(result.auto_resolved).toBe(true);
      expect(result.create_new).toBe(false);
      expect(result.resolved_payload.work_summary).toBe('local changes');
    });
  });

  describe('merge (time_entries)', () => {
    it('merges hours using delta', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: { hours: 10, _original_hours: 8 },
      });
      const serverData = { hours: 9, notes: 'server notes' };
      const result = resolveConflict(item, serverData, 2);

      expect(result.auto_resolved).toBe(true);
      // delta = 10 - 8 = 2, merged = 9 + 2 = 11
      expect(result.resolved_payload.hours).toBe(11);
    });

    it('handles no hours conflict', () => {
      const item = makeItem({
        entity_type: 'time_entries',
        payload: { notes: 'local notes' },
      });
      const serverData = { hours: 8, notes: 'server notes' };
      const result = resolveConflict(item, serverData, 2);

      expect(result.auto_resolved).toBe(true);
      expect(result.resolved_payload.notes).toBe('local notes');
    });
  });

  describe('always_keep_both (photos)', () => {
    it('creates new record for updates', () => {
      const item = makeItem({
        entity_type: 'photos',
        action: 'update',
        payload: { uri: 'photo.jpg' },
      });
      const result = resolveConflict(item, {}, 2);

      expect(result.auto_resolved).toBe(true);
      expect(result.create_new).toBe(true);
      expect(result.resolved_payload._offline_duplicate).toBe(true);
    });

    it('does not auto-resolve deletes', () => {
      const item = makeItem({
        entity_type: 'photos',
        action: 'delete',
      });
      const result = resolveConflict(item, {}, 2);

      expect(result.auto_resolved).toBe(false);
      expect(result.create_new).toBe(false);
    });
  });
});
