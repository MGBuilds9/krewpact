import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLedgerEntry,
  createTransferEntries,
  getItemStockAtLocation,
  getJobMaterialCost,
  refreshStockSummary,
} from '@/lib/inventory/ledger';

// ============================================================
// Mock logger to suppress output during tests
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
// Test UUIDs (deterministic for assertions)
// ============================================================
const UUID = {
  item1: '00000000-0000-4000-a000-000000000001',
  item2: '00000000-0000-4000-a000-000000000002',
  div1: '00000000-0000-4000-b000-000000000001',
  loc1: '00000000-0000-4000-8000-000000000001',
  locFrom: '00000000-0000-4000-8000-000000000002',
  locTo: '00000000-0000-4000-8000-000000000003',
  locA: '00000000-0000-4000-8000-000000000004',
  locB: '00000000-0000-4000-8000-000000000005',
  proj1: '00000000-0000-4000-9000-000000000001',
  user1: '00000000-0000-4000-a000-000000000010',
  org1: '00000000-0000-4000-a000-000000000020',
  entry1: '00000000-0000-4000-a100-000000000001',
  entry2: '00000000-0000-4000-a100-000000000002',
  src1: '00000000-0000-4000-a100-000000000003',
  dst1: '00000000-0000-4000-a100-000000000004',
};

// ============================================================
// Mock Supabase client factory
// ============================================================

function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  const from = vi.fn().mockReturnValue(chainable);
  const rpc = vi.fn();

  return {
    client: { from, rpc } as unknown as Parameters<typeof createLedgerEntry>[0],
    from,
    rpc,
    chainable,
  };
}

// ============================================================
// createLedgerEntry
// ============================================================
describe('createLedgerEntry', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('creates entry with correct fields and computes value_change', async () => {
    const mockRow = {
      id: UUID.entry1,
      org_id: UUID.org1,
      division_id: UUID.div1,
      item_id: UUID.item1,
      transaction_type: 'purchase_receipt' as const,
      qty_change: 10,
      valuation_rate: 25.5,
      value_change: 255.0,
      location_id: UUID.loc1,
      spot_id: null,
      project_id: null,
      serial_id: null,
      lot_number: null,
      counterpart_location_id: null,
      reference_type: null,
      reference_id: null,
      reason_code: null,
      notes: null,
      transacted_by: UUID.user1,
      transacted_at: '2026-03-20T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
    };

    mock.chainable.single.mockResolvedValue({ data: mockRow, error: null });

    const result = await createLedgerEntry(mock.client, {
      item_id: UUID.item1,
      division_id: UUID.div1,
      transaction_type: 'purchase_receipt',
      qty_change: 10,
      valuation_rate: 25.5,
      location_id: UUID.loc1,
      transacted_by: UUID.user1,
    });

    expect(result).toEqual(mockRow);
    expect(mock.from).toHaveBeenCalledWith('inventory_ledger');
    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        qty_change: 10,
        valuation_rate: 25.5,
        value_change: 255.0,
      }),
    );
  });

  it('rejects qty_change = 0', async () => {
    await expect(
      createLedgerEntry(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        transaction_type: 'purchase_receipt',
        qty_change: 0,
        location_id: UUID.loc1,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Invalid ledger entry');
  });

  it('rejects material_issue without project_id', async () => {
    await expect(
      createLedgerEntry(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        transaction_type: 'material_issue',
        qty_change: -5,
        location_id: UUID.loc1,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Invalid ledger entry');
  });

  it('rejects stock_adjustment without reason_code', async () => {
    await expect(
      createLedgerEntry(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        transaction_type: 'stock_adjustment',
        qty_change: -3,
        location_id: UUID.loc1,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Invalid ledger entry');
  });

  it('accepts material_issue with project_id', async () => {
    const mockRow = {
      id: UUID.entry2,
      org_id: UUID.org1,
      division_id: UUID.div1,
      item_id: UUID.item1,
      transaction_type: 'material_issue' as const,
      qty_change: -5,
      valuation_rate: 10,
      value_change: -50,
      location_id: UUID.loc1,
      spot_id: null,
      project_id: UUID.proj1,
      serial_id: null,
      lot_number: null,
      counterpart_location_id: null,
      reference_type: null,
      reference_id: null,
      reason_code: null,
      notes: null,
      transacted_by: UUID.user1,
      transacted_at: '2026-03-20T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
    };

    mock.chainable.single.mockResolvedValue({ data: mockRow, error: null });

    const result = await createLedgerEntry(mock.client, {
      item_id: UUID.item1,
      division_id: UUID.div1,
      transaction_type: 'material_issue',
      qty_change: -5,
      valuation_rate: 10,
      location_id: UUID.loc1,
      project_id: UUID.proj1,
      transacted_by: UUID.user1,
    });

    expect(result.project_id).toBe(UUID.proj1);
    expect(result.value_change).toBe(-50);
  });

  it('throws on Supabase insert error', async () => {
    mock.chainable.single.mockResolvedValue({
      data: null,
      error: { message: 'insert error' },
    });

    await expect(
      createLedgerEntry(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        transaction_type: 'purchase_receipt',
        qty_change: 5,
        location_id: UUID.loc1,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Ledger insert failed');
  });
});

// ============================================================
// createTransferEntries
// ============================================================
describe('createTransferEntries', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('creates two entries with opposite signs', async () => {
    const sourceRow = {
      id: UUID.src1,
      org_id: UUID.org1,
      division_id: UUID.div1,
      item_id: UUID.item1,
      transaction_type: 'stock_transfer' as const,
      qty_change: -10,
      valuation_rate: 20,
      value_change: -200,
      location_id: UUID.locFrom,
      spot_id: null,
      project_id: null,
      serial_id: null,
      lot_number: null,
      counterpart_location_id: UUID.locTo,
      reference_type: null,
      reference_id: null,
      reason_code: null,
      notes: null,
      transacted_by: UUID.user1,
      transacted_at: '2026-03-20T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
    };

    const destRow = {
      ...sourceRow,
      id: UUID.dst1,
      qty_change: 10,
      value_change: 200,
      location_id: UUID.locTo,
      counterpart_location_id: UUID.locFrom,
    };

    mock.chainable.select.mockResolvedValue({ data: [sourceRow, destRow], error: null });

    const [src, dst] = await createTransferEntries(mock.client, {
      item_id: UUID.item1,
      division_id: UUID.div1,
      qty: 10,
      valuation_rate: 20,
      from_location_id: UUID.locFrom,
      to_location_id: UUID.locTo,
      transacted_by: UUID.user1,
    });

    expect(src.qty_change).toBe(-10);
    expect(dst.qty_change).toBe(10);
    expect(src.value_change).toBe(-200);
    expect(dst.value_change).toBe(200);
    expect(src.location_id).toBe(UUID.locFrom);
    expect(dst.location_id).toBe(UUID.locTo);
    expect(src.counterpart_location_id).toBe(UUID.locTo);
    expect(dst.counterpart_location_id).toBe(UUID.locFrom);
  });

  it('both entries have same absolute qty but opposite signs', async () => {
    const rows = [
      { id: 'a', qty_change: -5, value_change: -100 },
      { id: 'b', qty_change: 5, value_change: 100 },
    ];
    mock.chainable.select.mockResolvedValue({ data: rows, error: null });

    const [src, dst] = await createTransferEntries(mock.client, {
      item_id: UUID.item1,
      division_id: UUID.div1,
      qty: 5,
      valuation_rate: 20,
      from_location_id: UUID.locA,
      to_location_id: UUID.locB,
      transacted_by: UUID.user1,
    });

    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ qty_change: -5 }),
        expect.objectContaining({ qty_change: 5 }),
      ]),
    );

    expect(Math.abs(Number(src.qty_change))).toBe(Math.abs(Number(dst.qty_change)));
  });

  it('rejects qty <= 0', async () => {
    await expect(
      createTransferEntries(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        qty: 0,
        valuation_rate: 20,
        from_location_id: UUID.locA,
        to_location_id: UUID.locB,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Transfer qty must be positive');

    await expect(
      createTransferEntries(mock.client, {
        item_id: UUID.item1,
        division_id: UUID.div1,
        qty: -5,
        valuation_rate: 20,
        from_location_id: UUID.locA,
        to_location_id: UUID.locB,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('Transfer qty must be positive');
  });
});

// ============================================================
// getItemStockAtLocation
// ============================================================
describe('getItemStockAtLocation', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns qty_on_hand from view', async () => {
    mock.chainable.maybeSingle.mockResolvedValue({
      data: { qty_on_hand: 42 },
      error: null,
    });

    const qty = await getItemStockAtLocation(mock.client, UUID.item1, UUID.loc1);

    expect(qty).toBe(42);
    expect(mock.from).toHaveBeenCalledWith('inventory_stock_summary');
    expect(mock.chainable.eq).toHaveBeenCalledWith('item_id', UUID.item1);
    expect(mock.chainable.eq).toHaveBeenCalledWith('location_id', UUID.loc1);
  });

  it('returns 0 when no stock exists', async () => {
    mock.chainable.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const qty = await getItemStockAtLocation(mock.client, UUID.item1, UUID.loc1);

    expect(qty).toBe(0);
  });

  it('throws on query error', async () => {
    mock.chainable.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'query failed' },
    });

    await expect(getItemStockAtLocation(mock.client, UUID.item1, UUID.loc1)).rejects.toThrow(
      'Stock query failed',
    );
  });
});

// ============================================================
// getJobMaterialCost
// ============================================================
describe('getJobMaterialCost', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('aggregates value_change for project entries', async () => {
    const entries = [
      { value_change: -150.5, qty_change: -5, item_id: UUID.item1, project_id: UUID.proj1 },
      { value_change: -200.0, qty_change: -10, item_id: UUID.item2, project_id: UUID.proj1 },
      { value_change: 50.0, qty_change: 2, item_id: UUID.item1, project_id: UUID.proj1 },
    ];

    mock.chainable.order.mockResolvedValue({ data: entries, error: null });

    const result = await getJobMaterialCost(mock.client, UUID.proj1);

    expect(result.total_cost).toBe(-300.5);
    expect(result.entries).toHaveLength(3);
    expect(mock.from).toHaveBeenCalledWith('inventory_ledger');
    expect(mock.chainable.eq).toHaveBeenCalledWith('project_id', UUID.proj1);
  });

  it('returns 0 cost with empty entries when no data', async () => {
    mock.chainable.order.mockResolvedValue({ data: [], error: null });

    const result = await getJobMaterialCost(mock.client, UUID.proj1);

    expect(result.total_cost).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it('throws on query error', async () => {
    mock.chainable.order.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });

    await expect(getJobMaterialCost(mock.client, UUID.proj1)).rejects.toThrow(
      'Job material cost query failed',
    );
  });
});

// ============================================================
// refreshStockSummary
// ============================================================
describe('refreshStockSummary', () => {
  it('calls rpc to refresh materialized view', async () => {
    const mock = createMockSupabase();
    mock.rpc.mockResolvedValue({ data: null, error: null });

    await refreshStockSummary(mock.client);

    expect(mock.rpc).toHaveBeenCalledWith('refresh_inventory_stock_summary');
  });

  it('throws when rpc fails', async () => {
    const mock = createMockSupabase();
    mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'function not found' } });

    await expect(refreshStockSummary(mock.client)).rejects.toThrow(
      'Stock summary refresh failed: function not found',
    );
    expect(mock.rpc).toHaveBeenCalledTimes(1);
  });
});
