import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OfflineAction, OfflineEntityType } from '@/lib/offline/types';

// Mock idb before importing store
const mockStore = new Map<number, Record<string, unknown>>();
let autoId = 0;

vi.mock('idb', () => {
  return {
    openDB: vi.fn(() =>
      Promise.resolve({
        add: vi.fn((_storeName: string, item: Record<string, unknown>) => {
          autoId++;
          const withId = { ...item, id: autoId };
          mockStore.set(autoId, withId);
          return Promise.resolve(autoId);
        }),
        getAll: vi.fn(() => Promise.resolve(Array.from(mockStore.values()))),
        getAllFromIndex: vi.fn((_storeName: string, indexName: string, key: unknown) => {
          const items = Array.from(mockStore.values());
          if (indexName === 'by-status') {
            return Promise.resolve(items.filter((i) => i.status === key));
          }
          if (indexName === 'by-entity') {
            const [entityType, entityId] = key as [string, string];
            return Promise.resolve(
              items.filter((i) => i.entity_type === entityType && i.entity_id === entityId),
            );
          }
          return Promise.resolve([]);
        }),
        get: vi.fn((_storeName: string, id: number) => Promise.resolve(mockStore.get(id))),
        put: vi.fn((_storeName: string, item: Record<string, unknown>) => {
          if (item.id !== undefined) {
            mockStore.set(item.id as number, item);
          }
          return Promise.resolve();
        }),
        delete: vi.fn((_storeName: string, id: number) => {
          mockStore.delete(id);
          return Promise.resolve();
        }),
        transaction: vi.fn(() => ({
          store: {
            delete: vi.fn((id: number) => {
              mockStore.delete(id);
              return Promise.resolve();
            }),
          },
          done: Promise.resolve(),
        })),
        close: vi.fn(),
      }),
    ),
  };
});

import {
  addToQueue,
  clearSyncedItems,
  closeDB,
  countByStatus,
  deleteItem,
  getAllItems,
  getItem,
  getItemsByEntity,
  getItemsByStatus,
  updateItem,
} from '@/lib/offline/store';

interface EnqueueArgs {
  t: OfflineEntityType;
  id: string;
  a: OfflineAction;
  p?: Record<string, unknown>;
  v?: number;
}

/** Helper to call addToQueue concisely in tests */
function enqueue(
  entity_type: OfflineEntityType,
  entity_id: string,
  action: OfflineAction,
  payload?: Record<string, unknown>,
) {
  return addToQueue({ entity_type, entity_id, action, payload: payload ?? {} });
}

/** Helper with version param */
function enqueueV(args: EnqueueArgs) {
  return addToQueue({
    entity_type: args.t,
    entity_id: args.id,
    action: args.a,
    payload: args.p ?? {},
    version: args.v,
  });
}

describe('Offline Store', () => {
  beforeEach(() => {
    mockStore.clear();
    autoId = 0;
    closeDB();
  });

  afterEach(() => {
    closeDB();
  });

  describe('addToQueue', () => {
    it('adds an item and returns its id', async () => {
      const id = await enqueueV({
        t: 'daily_logs',
        id: 'entity-1',
        a: 'create',
        p: { notes: 'test' },
        v: 1,
      });

      expect(id).toBe(1);
      expect(mockStore.size).toBe(1);
    });

    it('sets default status to pending', async () => {
      await enqueue('daily_logs', 'e-1', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      expect(item.status).toBe('pending');
    });

    it('sets retry_count to 0', async () => {
      await enqueue('daily_logs', 'e-1', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      expect(item.retry_count).toBe(0);
    });

    it('records created_at timestamp', async () => {
      await enqueue('daily_logs', 'e-1', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      expect(item.created_at).toBeDefined();
      expect(typeof item.created_at).toBe('string');
    });
  });

  describe('getAllItems', () => {
    it('returns empty array when no items exist', async () => {
      const items = await getAllItems();
      expect(items).toEqual([]);
    });

    it('returns all queued items', async () => {
      await enqueue('daily_logs', 'e-1', 'create');
      await enqueue('photos', 'e-2', 'create');

      const items = await getAllItems();
      expect(items).toHaveLength(2);
    });
  });

  describe('getItemsByStatus', () => {
    it('filters by status', async () => {
      await enqueue('daily_logs', 'e-1', 'create');
      await enqueue('photos', 'e-2', 'create');

      const pending = await getItemsByStatus('pending');
      expect(pending).toHaveLength(2);

      const synced = await getItemsByStatus('synced');
      expect(synced).toHaveLength(0);
    });
  });

  describe('getItem', () => {
    it('returns item by id', async () => {
      const id = await enqueue('daily_logs', 'e-1', 'create', { note: 'x' });
      const item = await getItem(id);

      expect(item).toBeDefined();
      expect(item?.entity_type).toBe('daily_logs');
    });

    it('returns undefined for non-existent id', async () => {
      const item = await getItem(999);
      expect(item).toBeUndefined();
    });
  });

  describe('getItemsByEntity', () => {
    it('returns items matching entity type and id', async () => {
      await enqueue('daily_logs', 'e-1', 'create');
      await enqueue('daily_logs', 'e-1', 'update');
      await enqueue('photos', 'e-2', 'create');

      const items = await getItemsByEntity('daily_logs', 'e-1');
      expect(items).toHaveLength(2);
    });
  });

  describe('updateItem', () => {
    it('updates an existing item', async () => {
      await enqueue('daily_logs', 'e-1', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      item.status = 'synced';
      await updateItem(item as never);

      const updated = mockStore.get(1) as Record<string, unknown>;
      expect(updated.status).toBe('synced');
    });

    it('throws when item has no id', async () => {
      await expect(updateItem({ entity_type: 'daily_logs' } as never)).rejects.toThrow(
        'Cannot update item without id',
      );
    });
  });

  describe('deleteItem', () => {
    it('removes an item from the store', async () => {
      const id = await enqueue('daily_logs', 'e-1', 'create');
      expect(mockStore.size).toBe(1);

      await deleteItem(id);
      expect(mockStore.size).toBe(0);
    });
  });

  describe('clearSyncedItems', () => {
    it('removes all synced items and returns count', async () => {
      await enqueue('daily_logs', 'e-1', 'create');
      await enqueue('daily_logs', 'e-2', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      item.status = 'synced';
      mockStore.set(1, item);

      const count = await clearSyncedItems();
      expect(count).toBe(1);
    });
  });

  describe('countByStatus', () => {
    it('returns counts for all statuses', async () => {
      await enqueue('daily_logs', 'e-1', 'create');
      await enqueue('daily_logs', 'e-2', 'create');

      const item = mockStore.get(1) as Record<string, unknown>;
      item.status = 'synced';
      mockStore.set(1, item);

      const counts = await countByStatus();
      expect(counts.pending).toBe(1);
      expect(counts.synced).toBe(1);
      expect(counts.failed).toBe(0);
      expect(counts.dead_letter).toBe(0);
      expect(counts.syncing).toBe(0);
    });
  });
});
