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

  it('returns paginated results with item and location names', async () => {
    const summaryData = [
      {
        item_id: UUID.item1,
        location_id: UUID.loc1,
        spot_id: null,
        qty_on_hand: 100,
        total_value: 2500,
        last_transaction_at: '2026-03-20T00:00:00Z',
      },
      {
        item_id: UUID.item2,
        location_id: UUID.loc1,
        spot_id: 'spot-a',
        qty_on_hand: 50,
        total_value: 1000,
        last_transaction_at: '2026-03-19T00:00:00Z',
      },
    ];

    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: summaryData,
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      data: [
        { id: UUID.item1, name: 'Copper Wire', sku: 'CW-001', division_id: UUID.div1 },
        { id: UUID.item2, name: 'PVC Conduit', sku: 'PVC-002', division_id: UUID.div1 },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      data: [{ id: UUID.loc1, name: 'Main Warehouse' }],
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
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [],
      error: null,
    });

    const result = await getStockSummary(mock.client, {});

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies item filter', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
        },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      data: [{ id: UUID.item1, name: 'Item A', sku: 'A-001', division_id: UUID.div1 }],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      data: [{ id: UUID.loc1, name: 'Warehouse' }],
      error: null,
    });

    await getStockSummary(mock.client, { itemId: UUID.item1 });

    expect(mock.table('inventory_stock_summary').eq).toHaveBeenCalledWith('item_id', UUID.item1);
  });

  it('applies search filter on item name', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
        },
        {
          item_id: UUID.item2,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 20,
          total_value: 200,
          last_transaction_at: null,
        },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      data: [
        { id: UUID.item1, name: 'Copper Wire', sku: 'CW-001', division_id: UUID.div1 },
        { id: UUID.item2, name: 'Steel Pipe', sku: 'SP-002', division_id: UUID.div1 },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      data: [{ id: UUID.loc1, name: 'Warehouse' }],
      error: null,
    });

    const result = await getStockSummary(mock.client, { search: 'copper' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_name).toBe('Copper Wire');
  });

  it('throws on query error', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: null,
      error: { message: 'view not found' },
    });

    await expect(getStockSummary(mock.client, {})).rejects.toThrow('Stock summary query failed');
  });

  // Regression: F1 — inventory items rendered as "Unknown"
  // Found by /qa on 2026-04-07
  // Report: .gstack/qa-reports/qa-report-krewpact-ca-2026-04-07-pr-verification.md
  //
  // The matview inventory_stock_summary has no RLS, so it returns rows for
  // items/locations the caller cannot SELECT. The previous implementation
  // fell back to 'Unknown' for unresolved rows, which displayed phantom
  // stock positions to users who couldn't actually open the items. The fix
  // filters those rows out so the UI shows only stock the user is authorized
  // to inspect.
  it('filters out rows whose item is RLS-restricted (no Unknown fallback)', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
        },
        {
          // RLS-restricted: not present in itemMap
          item_id: UUID.item2,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 20,
          total_value: 200,
          last_transaction_at: null,
        },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      // Only item1 returned; item2 is RLS-blocked
      data: [{ id: UUID.item1, name: 'Visible Item', sku: 'V-001', division_id: UUID.div1 }],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      data: [{ id: UUID.loc1, name: 'Warehouse A' }],
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10 });

    // Hidden row is dropped, not displayed with 'Unknown' fallback
    expect(result.data).toHaveLength(1);
    expect(result.data[0].item_id).toBe(UUID.item1);
    expect(result.data[0].item_name).toBe('Visible Item');
    expect(result.data.some((r) => r.item_name === 'Unknown')).toBe(false);
  });

  it('filters out rows whose location is RLS-restricted (no Unknown fallback)', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
        },
      ],
      error: null,
    });

    resolveAt(mock.table('inventory_items'), 'in', {
      data: [{ id: UUID.item1, name: 'Visible Item', sku: 'V-001', division_id: UUID.div1 }],
      error: null,
    });

    resolveAt(mock.table('inventory_locations'), 'in', {
      // Location is RLS-blocked
      data: [],
      error: null,
    });

    const result = await getStockSummary(mock.client, { limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.data.some((r) => r.location_name === 'Unknown')).toBe(false);
  });

  it('returns empty result when caller cannot resolve any rows (full RLS gap)', async () => {
    resolveAt(mock.table('inventory_stock_summary'), 'range', {
      data: [
        {
          item_id: UUID.item1,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 10,
          total_value: 100,
          last_transaction_at: null,
        },
        {
          item_id: UUID.item2,
          location_id: UUID.loc1,
          spot_id: null,
          qty_on_hand: 20,
          total_value: 200,
          last_transaction_at: null,
        },
      ],
      error: null,
    });

    // Caller has zero division access — items list is empty
    resolveAt(mock.table('inventory_items'), 'in', { data: [], error: null });
    resolveAt(mock.table('inventory_locations'), 'in', { data: [], error: null });

    const result = await getStockSummary(mock.client, { limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
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

    resolveAt(mock.table('inventory_stock_summary'), 'in', {
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
    resolveAt(mock.table('inventory_stock_summary'), 'in', {
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
