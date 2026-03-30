import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies before import
vi.mock('@/lib/offline/online-detector', () => ({
  getOnlineState: vi.fn(() => true),
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/offline/store', () => ({
  getItemsByStatus: vi.fn(() => Promise.resolve([])),
  updateItem: vi.fn(() => Promise.resolve()),
  clearSyncedItems: vi.fn(() => Promise.resolve(0)),
  getItem: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@/lib/offline/conflict-resolver', () => ({
  resolveConflict: vi.fn(() => ({
    resolved_payload: { notes: 'resolved', project_id: 'proj-1' },
    auto_resolved: true,
    resolution_note: 'test resolution',
    create_new: false,
  })),
}));

import { getOnlineState } from '@/lib/offline/online-detector';
import { clearSyncedItems, getItemsByStatus, updateItem } from '@/lib/offline/store';
import {
  getIsSyncing,
  getLastSyncAt,
  onSyncComplete,
  processQueue,
  startAutoSync,
} from '@/lib/offline/sync-engine';
import type { OfflineQueueItem } from '@/lib/offline/types';

function makePendingItem(
  overrides: Partial<OfflineQueueItem> = {},
): OfflineQueueItem {
  return {
    id: 1,
    entity_type: 'daily_logs',
    entity_id: 'e-1',
    action: 'create',
    payload: { notes: 'test', project_id: 'proj-1' },
    status: 'pending',
    retry_count: 0,
    version: 1,
    created_at: '2026-03-29T10:00:00Z',
    ...overrides,
  };
}

describe('Sync Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getOnlineState).mockReturnValue(true);
    vi.mocked(getItemsByStatus).mockResolvedValue([]);
    vi.mocked(updateItem).mockResolvedValue(undefined);
    vi.mocked(clearSyncedItems).mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processQueue', () => {
    it('returns empty array when no pending items', async () => {
      vi.mocked(getItemsByStatus).mockResolvedValue([]);

      const results = await processQueue();
      expect(results).toEqual([]);
    });

    it('returns empty array when offline', async () => {
      vi.mocked(getOnlineState).mockReturnValue(false);
      vi.mocked(getItemsByStatus).mockResolvedValue([makePendingItem()]);

      const results = await processQueue();
      expect(results).toEqual([]);
    });

    it('processes pending items and marks as synced on success', async () => {
      const item = makePendingItem();
      // First call returns items, second call (re-fetch) returns empty
      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([item])
        .mockResolvedValue([]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ version: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const results = await processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(updateItem).toHaveBeenCalled();
    });

    it('handles API errors and increments retry_count', async () => {
      const item = makePendingItem();
      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([item])
        .mockResolvedValue([]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 }),
      );

      const results = await processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it('dead-letters after max retries', async () => {
      const item = makePendingItem({ retry_count: 2 }); // Will become 3
      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([item])
        .mockResolvedValue([]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 500 }),
      );

      const results = await processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Dead-lettered');
    });

    it('handles 409 conflict responses', async () => {
      const item = makePendingItem({ action: 'update' });
      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([item])
        .mockResolvedValue([]);

      // First call: 409, second: fetch server state, third: retry
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(null, { status: 409 }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ notes: 'server', version: 2 }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ version: 3 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const results = await processQueue();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].conflict_resolved).toBe(true);
    });

    it('notifies sync listeners on completion', async () => {
      const listener = vi.fn();
      onSyncComplete(listener);

      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([makePendingItem()])
        .mockResolvedValue([]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ version: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await processQueue();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ success: true }),
        ]),
      );
    });

    it('clears synced items after successful sync', async () => {
      vi.mocked(getItemsByStatus)
        .mockResolvedValueOnce([makePendingItem()])
        .mockResolvedValue([]);

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ version: 2 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await processQueue();

      expect(clearSyncedItems).toHaveBeenCalled();
    });
  });

  describe('getIsSyncing', () => {
    it('returns false when not syncing', () => {
      expect(getIsSyncing()).toBe(false);
    });
  });

  describe('getLastSyncAt', () => {
    it('returns null or a valid ISO timestamp', () => {
      const value = getLastSyncAt();
      // Module-level state — may be null (first test) or a timestamp (after sync tests)
      if (value !== null) {
        expect(new Date(value).toISOString()).toBe(value);
      } else {
        expect(value).toBe(null);
      }
    });
  });

  describe('startAutoSync', () => {
    it('returns an unsubscribe function', () => {
      const unsub = startAutoSync();
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });
});
