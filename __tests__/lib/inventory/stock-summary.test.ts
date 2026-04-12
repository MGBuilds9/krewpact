import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLowStockItems,
  getStockByProject,
  getStockSummary,
} from '@/lib/inventory/stock-summary';

// ============================================================
// Mock logger
// ============================================================
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================
// Test UUIDs
// ============================================================
const UUID = {
  item1: '00000000-0000-4000-a000-000000000001',
  item2: '00000000-0000-4000-a000-000000000002',
  div1: '00000000-0000-4000-b000-000000000001',
  divTelecom: '00000000-0000-4000-b000-000000000002',
  loc1: '00000000-0000-4000-8000-000000000001',
  proj1: '00000000-0000-4000-9000-000000000001',
};

// ============================================================
// Mock Supabase client factory
//
// Each table gets its own chainable. Every method returns itself
// (for chaining) except the terminal method, which must be set
// by the test via mockResolvedValue on the LAST method in the chain.
//
// For getLowStockItems: the chain is select().not().gt() [or .gt().eq()]
// When divisionId is present, eq() is chained AFTER gt(), so gt() must
// return the chainable (not a promise). The terminal method in that
// branch is eq(), which should resolve with the data.
// ============================================================

interface MockTable {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

function createChainable(): MockTable {
  const obj: MockTable = {
    select: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    not: vi.fn(),
    gt: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Make each method return the chainable for chaining by default
  for (const key of Object.keys(obj) as (keyof MockTable)[]) {
    (obj[key] as ReturnType<typeof vi.fn>).mockReturnValue(obj);
  }

  return obj;
}

function createMockSupabase() {
  const tables: Record<string, MockTable> = {};

  const from = vi.fn((tableName: string) => {
    if (!tables[tableName]) {
      tables[tableName] = createChainable();
    }
    return tables[tableName];
  });

  const rpc = vi.fn();

  return {
    client: { from, rpc } as unknown as Parameters<typeof getStockSummary>[0],
    from,
    rpc,
    table: (name: string) => {
      if (!tables[name]) {
        tables[name] = createChainable();
      }
      return tables[name];
    },
  };
}

/**
 * Helper: sets the terminal method on a mock table to resolve with data.
 * The "terminal" is the last method in the Supabase chain that resolves
 * the query. We use mockImplementation to make it return { data, error }
 * as a resolved promise while still being a thenable.
 */
function resolveAt(
  table: MockTable,
  method: keyof MockTable,
  result: { data: unknown; error: unknown },
) {
  (table[method] as ReturnType<typeof vi.fn>).mockResolvedValue(result);
}

// ============================================================
// getStockSummary
// ============================================================
describe('getStockSummary', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns paginated results with item and location names from secure view', async () => {
    const summaryData = [
      {
        item_id: UUID.item1,
        location_id: UUID.loc1,
        spot_id: null,
        qty_on_hand: 100,
        total_value: 2500,
        last_transaction_at: '2026-03-20T00:00:00Z',
        item_name: 'Copper Wire',
        item_sku: 'CW-001',
        division_id: UUID.div1,
        location_name: 'Main Warehouse',
      },
      {
        item_id: UUID.item2,
        location_id: UUID.loc1,
        spot_id: 'spot-a',
        qty_on_hand: 50,
        total_value: 1000,
        last_transaction_at: '2026-03-19T00:00:00Z',
        item_name: 'PVC Conduit',
        item_sku: 'PVC-002',
        division_id: UUID.div1,
        location_name: 'Main Warehouse',
      },
    ];

    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: summaryData,
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10, offset: 0 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].item_name).toBe('Copper Wire');
    expect(result.data[0].location_name).toBe('Main Warehouse');
    expect(result.data[0].qty_on_hand).toBe(100);
    expect(result.data[1].item_name).toBe('PVC Conduit');
    expect(result.data[1].spot_id).toBe('spot-a');
  });

  it('returns empty array when no stock data', async () => {
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [],
      error: null,
    });

    const result = await getStockSummary(mock.client, {});

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies item filter', async () => {
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
          item_name: 'Item A',
          item_sku: 'A-001',
          division_id: UUID.div1,
          location_name: 'Warehouse',
        },
      ],
      error: null,
    });

    await getStockSummary(mock.client, { itemId: UUID.item1 });

    expect(mock.table('inventory_stock_summary_secure').eq).toHaveBeenCalledWith(
      'item_id',
      UUID.item1,
    );
  });

  it('applies search filter on item name', async () => {
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
          item_name: 'Copper Wire',
          item_sku: 'CW-001',
          division_id: UUID.div1,
          location_name: 'Warehouse',
        },
        {
          item_id: UUID.item2,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 20,
          total_value: 200,
          last_transaction_at: null,
          item_name: 'Steel Pipe',
          item_sku: 'SP-002',
          division_id: UUID.div1,
          location_name: 'Warehouse',
        },
      ],
      error: null,
    });

    const result = await getStockSummary(mock.client, { search: 'copper' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_name).toBe('Copper Wire');
  });

  it('throws on query error', async () => {
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: null,
      error: { message: 'view not found' },
    });

    await expect(getStockSummary(mock.client, {})).rejects.toThrow('Stock summary query failed');
  });

  // RLS is now enforced at the database level via the SECURITY INVOKER view.
  // The INNER JOIN on inventory_items and inventory_locations means rows for
  // items/locations the caller cannot SELECT are automatically excluded.
  // These tests verify the function correctly handles what the view returns.

  it('filters out items from other divisions via RLS (secure view returns only visible)', async () => {
    // The secure view's INNER JOIN + RLS means only visible items are returned.
    // Mock: the view returns only item1 (item2 is filtered by RLS at DB level).
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
          item_name: 'Visible Item',
          item_sku: 'V-001',
          division_id: UUID.div1,
          location_name: 'Warehouse A',
        },
      ],
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10 });

    // Only the visible item is returned; RLS-restricted item2 never arrives
    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_id).toBe(UUID.item1);
    expect(result.data[0].item_name).toBe('Visible Item');
    expect(result.data.some((r) => r.item_name === 'Unknown')).toBe(false);
  });

  it('returns empty when user has no division access (secure view returns [])', async () => {
    // User with zero division access: the secure view returns nothing
    // because all INNER JOINs on inventory_items fail RLS.
    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [],
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('handles matview with RLS join correctly — enriched fields come from view directly', async () => {
    // Verify that item_name, item_sku, division_id, and location_name
    // are read directly from the secure view, not from separate lookups.
    const viewRow = {
      item_id: UUID.item1,
      location_id: UUID.loc1,
      spot_id: null,
      qty_on_hand: 42,
      total_value: 1050,
      last_transaction_at: '2026-04-09T12:00:00Z',
      item_name: 'Fiber Optic Cable',
      item_sku: 'FOC-100',
      division_id: UUID.divTelecom,
      location_name: 'Telecom Yard',
    };

    resolveAt(mock.table('inventory_stock_summary_secure'), 'range', {
      data: [viewRow],
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_name).toBe('Fiber Optic Cable');
    expect(result.data[0].item_sku).toBe('FOC-100');
    expect(result.data[0].location_name).toBe('Telecom Yard');
    expect(result.data[0].qty_on_hand).toBe(42);
    expect(result.data[0].total_value).toBe(1050);

    // No separate inventory_items or inventory_locations queries should exist
    expect(mock.from).not.toHaveBeenCalledWith('inventory_items');
    expect(mock.from).not.toHaveBeenCalledWith('inventory_locations');
  });
});

// ============================================================
// getLowStockItems
// ============================================================
describe('getLowStockItems', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns items below min_stock_level', async () => {
    // Chain: select().not().gt() — gt is terminal when no divisionId
    resolveAt(mock.table('inventory_items'), 'gt', {
      data: [
        {
          id: UUID.item1,
          name: 'Wire',
          sku: 'W-001',
          min_stock_level: 100,
          division_id: UUID.div1,
        },
        { id: UUID.item2, name: 'Pipe', sku: 'P-001', min_stock_level: 50, division_id: UUID.div1 },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_stock_summary_secure'), 'in', {
      data: [
        { item_id: UUID.item1, location_id: UUID.loc1, qty_on_hand: 30 },
        { item_id: UUID.item2, location_id: UUID.loc1, qty_on_hand: 60 },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      data: [{ id: UUID.loc1, name: 'Warehouse A' }],
      error: null,
    });

    const result = await getLowStockItems(mock.client);

    // Only item-1 is below threshold (30 < 100). item-2 is above (60 >= 50).
    expect(result).toHaveLength(1);
    expect(result[0].item_id).toBe(UUID.item1);
    expect(result[0].item_name).toBe('Wire');
    expect(result[0].qty_on_hand).toBe(30);
    expect(result[0].min_stock_level).toBe(100);
    expect(result[0].deficit).toBe(70);
    expect(result[0].location_name).toBe('Warehouse A');
  });

  it('returns empty array when no items have min_stock_level', async () => {
    resolveAt(mock.table('inventory_items'), 'gt', {
      data: [],
      error: null,
    });

    const result = await getLowStockItems(mock.client);

    expect(result).toHaveLength(0);
  });

  it('filters by division when provided', async () => {
    // When divisionId is provided, chain is: select().not().gt().eq()
    // gt() must return chainable (not resolve), eq() is the terminal
    // Reset gt to return chainable (default behavior from createChainable)
    const itemsTable = mock.table('inventory_items');
    itemsTable.gt.mockReturnValue(itemsTable); // chainable, not resolved

    resolveAt(itemsTable, 'eq', {
      data: [],
      error: null,
    });

    await getLowStockItems(mock.client, UUID.divTelecom);

    expect(itemsTable.eq).toHaveBeenCalledWith('division_id', UUID.divTelecom);
  });

  it('returns items with zero stock when min_stock_level is set', async () => {
    resolveAt(mock.table('inventory_items'), 'gt', {
      data: [
        {
          id: UUID.item1,
          name: 'Rare Part',
          sku: 'RP-001',
          min_stock_level: 10,
          division_id: UUID.div1,
        },
      ],
      error: null,
    });

    // No stock rows for this item
    resolveAt(mock.table('inventory_stock_summary_secure'), 'in', {
      data: [],
      error: null,
    });

    const result = await getLowStockItems(mock.client);

    expect(result).toHaveLength(1);
    expect(result[0].qty_on_hand).toBe(0);
    expect(result[0].deficit).toBe(10);
  });
});

// ============================================================
// getStockByProject
// ============================================================
describe('getStockByProject', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('aggregates materials by item for a project', async () => {
    resolveAt(mock.table('inventory_ledger'), 'eq', {
      data: [
        { item_id: UUID.item1, qty_change: -10, value_change: -250 },
        { item_id: UUID.item1, qty_change: -5, value_change: -125 },
        { item_id: UUID.item2, qty_change: -20, value_change: -400 },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      data: [
        { id: UUID.item1, name: 'Copper Wire' },
        { id: UUID.item2, name: 'PVC Conduit' },
      ],
      error: null,
    });

    const result = await getStockByProject(mock.client, UUID.proj1);

    expect(result.items).toHaveLength(2);
    expect(result.total_cost).toBe(-775);

    const wire = result.items.find((i) => i.item_id === UUID.item1);
    expect(wire).toBeDefined();
    expect(wire!.total_qty).toBe(-15);
    expect(wire!.total_value).toBe(-375);
    expect(wire!.item_name).toBe('Copper Wire');

    const conduit = result.items.find((i) => i.item_id === UUID.item2);
    expect(conduit).toBeDefined();
    expect(conduit!.total_qty).toBe(-20);
    expect(conduit!.total_value).toBe(-400);
  });

  it('returns empty result when no materials for project', async () => {
    resolveAt(mock.table('inventory_ledger'), 'eq', {
      data: [],
      error: null,
    });

    const result = await getStockByProject(mock.client, UUID.proj1);

    expect(result.items).toHaveLength(0);
    expect(result.total_cost).toBe(0);
  });

  it('throws on query error', async () => {
    resolveAt(mock.table('inventory_ledger'), 'eq', {
      data: null,
      error: { message: 'db error' },
    });

    await expect(getStockByProject(mock.client, UUID.proj1)).rejects.toThrow(
      'Project materials query failed',
    );
  });
});
