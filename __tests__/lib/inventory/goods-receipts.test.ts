import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  confirmGoodsReceipt,
  createGoodsReceipt,
  getGoodsReceipt,
  listGoodsReceipts,
} from '@/lib/inventory/goods-receipts';
import { createLedgerEntry } from '@/lib/inventory/ledger';

// ============================================================
// Mocks
// ============================================================
vi.mock('@/lib/inventory/ledger', () => ({
  createLedgerEntry: vi.fn().mockResolvedValue({ id: 'ledger-1' }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ============================================================
// Test UUIDs
// ============================================================
const UUID = {
  div1: '00000000-0000-4000-b000-000000000001',
  po1: '00000000-0000-4000-d000-000000000001',
  gr1: '00000000-0000-4000-f000-000000000001',
  item1: '00000000-0000-4000-a000-000000000001',
  item2: '00000000-0000-4000-a000-000000000002',
  loc1: '00000000-0000-4000-8000-000000000001',
  user1: '00000000-0000-4000-a000-000000000010',
  poLine1: '00000000-0000-4000-e000-000000000001',
  poLine2: '00000000-0000-4000-e000-000000000002',
  grLine1: '00000000-0000-4000-f100-000000000001',
  grLine2: '00000000-0000-4000-f100-000000000002',
};

// ============================================================
// Thenable mock Supabase client
// ============================================================
function createMockSupabase() {
  const queue: Array<{ data?: unknown; error?: unknown; count?: number }> = [];
  let queueIndex = 0;

  function dequeue() {
    return queue[queueIndex++] ?? { data: null, error: null };
  }

  function makeChainable() {
    const builder: Record<string, unknown> = {};

    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'like',
      'ilike',
      'in',
      'is',
      'not',
      'order',
      'range',
      'limit',
    ];

    for (const method of methods) {
      builder[method] = vi.fn().mockImplementation(() => builder);
    }

    builder.single = vi.fn().mockImplementation(() => Promise.resolve(dequeue()));
    builder.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(dequeue()));

    builder.then = (resolve?: (val: unknown) => unknown, reject?: (err: unknown) => unknown) => {
      return Promise.resolve(dequeue()).then(resolve, reject);
    };

    return builder;
  }

  const fromFn = vi.fn().mockImplementation(() => makeChainable());

  return {
    client: { from: fromFn } as unknown as Parameters<typeof createGoodsReceipt>[0],
    from: fromFn,
    enqueue(result: { data?: unknown; error?: unknown; count?: number }) {
      queue.push(result);
    },
  };
}

// ============================================================
// createGoodsReceipt
// ============================================================
describe('createGoodsReceipt', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('creates GR with lines in draft status', async () => {
    const grRow = {
      id: UUID.gr1,
      gr_number: 'GR-2026-0001',
      po_id: UUID.po1,
      division_id: UUID.div1,
      location_id: UUID.loc1,
      received_by: UUID.user1,
      created_by: UUID.user1,
      received_date: '2026-03-20',
      status: 'draft',
      notes: null,
      org_id: 'org-1',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    };

    const grLines = [
      {
        id: UUID.grLine1,
        gr_id: UUID.gr1,
        po_line_id: UUID.poLine1,
        item_id: UUID.item1,
        qty_received: 5,
        unit_price: 100,
        spot_id: null,
        serial_number: null,
        lot_number: null,
        condition_notes: null,
        created_at: '2026-03-20T00:00:00Z',
      },
    ];

    // 1. generateGrNumber → thenable (limit)
    mock.enqueue({ data: [], error: null });
    // 2. GR insert → single
    mock.enqueue({ data: grRow, error: null });
    // 3. GR lines insert → thenable (select)
    mock.enqueue({ data: grLines, error: null });

    const result = await createGoodsReceipt(mock.client, {
      po_id: UUID.po1,
      division_id: UUID.div1,
      location_id: UUID.loc1,
      received_by: UUID.user1,
      created_by: UUID.user1,
      lines: [
        {
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 5,
          unit_price: 100,
        },
      ],
    });

    expect(result.status).toBe('draft');
    expect(result.lines).toHaveLength(1);
    expect(mock.from).toHaveBeenCalledWith('inventory_goods_receipts');
    expect(mock.from).toHaveBeenCalledWith('inventory_gr_lines');
  });
});

// ============================================================
// confirmGoodsReceipt
// ============================================================
describe('confirmGoodsReceipt', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  function setupConfirmMocks(
    grLines: Array<{
      id: string;
      po_line_id: string;
      item_id: string;
      qty_received: number;
      unit_price: number;
      serial_number?: string | null;
      lot_number?: string | null;
      spot_id?: string | null;
      condition_notes?: string | null;
    }>,
    poLines: Array<{ id: string; qty_ordered: number; qty_received: number }>,
  ) {
    const grRow = {
      id: UUID.gr1,
      gr_number: 'GR-2026-0001',
      po_id: UUID.po1,
      division_id: UUID.div1,
      location_id: UUID.loc1,
      received_by: UUID.user1,
      created_by: UUID.user1,
      received_date: '2026-03-20',
      status: 'draft',
      notes: null,
      org_id: 'org-1',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
      inventory_gr_lines: grLines.map((l) => ({
        ...l,
        gr_id: UUID.gr1,
        serial_number: l.serial_number ?? null,
        lot_number: l.lot_number ?? null,
        spot_id: l.spot_id ?? null,
        condition_notes: l.condition_notes ?? null,
        created_at: '2026-03-20T00:00:00Z',
      })),
    };

    // 1. getGoodsReceipt → single
    mock.enqueue({ data: grRow, error: null });

    // 2. fetch PO lines for validation → thenable (via .in())
    mock.enqueue({ data: poLines, error: null });

    return { grRow };
  }

  it('creates ledger entries for each line', async () => {
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 5,
          unit_price: 100,
        },
        {
          id: UUID.grLine2,
          po_line_id: UUID.poLine2,
          item_id: UUID.item2,
          qty_received: 3,
          unit_price: 50,
        },
      ],
      [
        { id: UUID.poLine1, qty_ordered: 10, qty_received: 0 },
        { id: UUID.poLine2, qty_ordered: 10, qty_received: 0 },
      ],
    );

    // 3. Update PO line 1 qty_received → thenable
    mock.enqueue({ error: null });
    // 4. Update PO line 2 qty_received → thenable
    mock.enqueue({ error: null });
    // 5. Re-fetch PO lines for status → thenable
    mock.enqueue({
      data: [
        { qty_ordered: 10, qty_received: 5 },
        { qty_ordered: 10, qty_received: 3 },
      ],
      error: null,
    });
    // 6. Update PO status → thenable
    mock.enqueue({ error: null });
    // 7. Confirm GR → single
    mock.enqueue({
      data: { id: UUID.gr1, status: 'confirmed' },
      error: null,
    });

    await confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1);

    expect(createLedgerEntry).toHaveBeenCalledTimes(2);
    expect(createLedgerEntry).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({
        item_id: UUID.item1,
        transaction_type: 'purchase_receipt',
        qty_change: 5,
        valuation_rate: 100,
      }),
    );
    expect(createLedgerEntry).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({
        item_id: UUID.item2,
        transaction_type: 'purchase_receipt',
        qty_change: 3,
        valuation_rate: 50,
      }),
    );
  });

  it('updates PO line qty_received', async () => {
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 5,
          unit_price: 100,
        },
      ],
      [{ id: UUID.poLine1, qty_ordered: 10, qty_received: 0 }],
    );

    // Update PO line → thenable
    mock.enqueue({ error: null });
    // Re-fetch PO lines → thenable
    mock.enqueue({ data: [{ qty_ordered: 10, qty_received: 5 }], error: null });
    // Update PO status → thenable
    mock.enqueue({ error: null });
    // Confirm GR → single
    mock.enqueue({ data: { id: UUID.gr1, status: 'confirmed' }, error: null });

    await confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1);

    // Verify the PO line update call
    // The update happens on from('inventory_po_lines').update({ qty_received: 5 })
    const poLineUpdateCall = mock.from.mock.results.find(
      (
        _result: { value: Record<string, { mock: { calls: Array<Array<unknown>> } }> },
        idx: number,
      ) => {
        const call = mock.from.mock.calls[idx];
        return (
          call[0] === 'inventory_po_lines' &&
          mock.from.mock.results[idx].value.update?.mock?.calls?.length > 0
        );
      },
    );
    expect(poLineUpdateCall).toBeDefined();
  });

  it('sets PO to partially_received when partial', async () => {
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 5,
          unit_price: 100,
        },
      ],
      [{ id: UUID.poLine1, qty_ordered: 10, qty_received: 0 }],
    );

    mock.enqueue({ error: null }); // update PO line
    mock.enqueue({ data: [{ qty_ordered: 10, qty_received: 5 }], error: null }); // re-fetch
    mock.enqueue({ error: null }); // update PO status
    mock.enqueue({ data: { id: UUID.gr1, status: 'confirmed' }, error: null }); // confirm GR

    await confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1);

    // Find the PO status update call
    const poStatusCall = mock.from.mock.results.find(
      (
        _result: { value: Record<string, { mock: { calls: Array<Array<unknown>> } }> },
        idx: number,
      ) => {
        const call = mock.from.mock.calls[idx];
        if (call[0] !== 'inventory_purchase_orders') return false;
        const builder = mock.from.mock.results[idx].value;
        const updateCalls = builder.update?.mock?.calls;
        return updateCalls?.some(
          (c: Array<Record<string, unknown>>) => c[0]?.status === 'partially_received',
        );
      },
    );
    expect(poStatusCall).toBeDefined();
  });

  it('sets PO to fully_received when complete', async () => {
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 10,
          unit_price: 100,
        },
      ],
      [{ id: UUID.poLine1, qty_ordered: 10, qty_received: 0 }],
    );

    mock.enqueue({ error: null }); // update PO line
    mock.enqueue({ data: [{ qty_ordered: 10, qty_received: 10 }], error: null }); // re-fetch
    mock.enqueue({ error: null }); // update PO status
    mock.enqueue({ data: { id: UUID.gr1, status: 'confirmed' }, error: null }); // confirm GR

    await confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1);

    const poStatusCall = mock.from.mock.results.find(
      (
        _result: { value: Record<string, { mock: { calls: Array<Array<unknown>> } }> },
        idx: number,
      ) => {
        const call = mock.from.mock.calls[idx];
        if (call[0] !== 'inventory_purchase_orders') return false;
        const builder = mock.from.mock.results[idx].value;
        const updateCalls = builder.update?.mock?.calls;
        return updateCalls?.some(
          (c: Array<Record<string, unknown>>) => c[0]?.status === 'fully_received',
        );
      },
    );
    expect(poStatusCall).toBeDefined();
  });

  it('creates serial records for serial-tracked items', async () => {
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 1,
          unit_price: 500,
          serial_number: 'SN-001',
        },
      ],
      [{ id: UUID.poLine1, qty_ordered: 1, qty_received: 0 }],
    );

    mock.enqueue({ error: null }); // update PO line
    mock.enqueue({ error: null }); // serial insert
    mock.enqueue({ data: [{ qty_ordered: 1, qty_received: 1 }], error: null }); // re-fetch
    mock.enqueue({ error: null }); // update PO status
    mock.enqueue({ data: { id: UUID.gr1, status: 'confirmed' }, error: null }); // confirm GR

    await confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1);

    expect(mock.from).toHaveBeenCalledWith('inventory_serials');
  });

  it('validates before writing — rejects over-receiving', async () => {
    // Setup: PO line has 10 ordered, 8 already received, trying to receive 15
    setupConfirmMocks(
      [
        {
          id: UUID.grLine1,
          po_line_id: UUID.poLine1,
          item_id: UUID.item1,
          qty_received: 15,
          unit_price: 100,
        },
      ],
      [{ id: UUID.poLine1, qty_ordered: 10, qty_received: 8 }],
    );

    await expect(confirmGoodsReceipt(mock.client, UUID.gr1, UUID.user1)).rejects.toThrow(
      'Over-receiving',
    );

    // No ledger entries created (validation happened before writes)
    expect(createLedgerEntry).not.toHaveBeenCalled();
  });
});

// ============================================================
// getGoodsReceipt
// ============================================================
describe('getGoodsReceipt', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns GR with lines', async () => {
    mock.enqueue({
      data: {
        id: UUID.gr1,
        gr_number: 'GR-2026-0001',
        status: 'draft',
        inventory_gr_lines: [{ id: UUID.grLine1, gr_id: UUID.gr1, item_id: UUID.item1 }],
      },
      error: null,
    });

    const result = await getGoodsReceipt(mock.client, UUID.gr1);
    expect(result).not.toBeNull();
    expect(result!.lines).toHaveLength(1);
  });

  it('returns null when not found', async () => {
    mock.enqueue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getGoodsReceipt(mock.client, 'nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================================
// listGoodsReceipts
// ============================================================
describe('listGoodsReceipts', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns data with total count', async () => {
    mock.enqueue({
      data: [{ id: UUID.gr1, gr_number: 'GR-2026-0001' }],
      error: null,
      count: 1,
    });

    const result = await listGoodsReceipts(mock.client, { poId: UUID.po1 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
