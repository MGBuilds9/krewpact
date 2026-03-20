import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPoLine,
  approvePo,
  cancelPo,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  removePoLine,
  submitPo,
} from '@/lib/inventory/purchase-orders';

// ============================================================
// Mock logger
// ============================================================
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ============================================================
// Test UUIDs
// ============================================================
const UUID = {
  div1: '00000000-0000-4000-b000-000000000001',
  supplier1: '00000000-0000-4000-c000-000000000001',
  item1: '00000000-0000-4000-a000-000000000001',
  item2: '00000000-0000-4000-a000-000000000002',
  user1: '00000000-0000-4000-a000-000000000010',
  po1: '00000000-0000-4000-d000-000000000001',
  line1: '00000000-0000-4000-e000-000000000001',
  line2: '00000000-0000-4000-e000-000000000002',
};

// ============================================================
// Thenable mock Supabase client
// ============================================================
// Every from() call returns a builder that is thenable (has .then()).
// The queue is consumed when:
//   - .then() is called (i.e. `await chain`)
//   - .single() is called
//   - .maybeSingle() is called
// This means ANY chain position can be the terminal.
// ============================================================

function createMockSupabase() {
  const queue: Array<{ data?: unknown; error?: unknown; count?: number }> = [];
  let queueIndex = 0;

  function dequeue() {
    const result = queue[queueIndex++] ?? { data: null, error: null };
    return result;
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

    // Terminal methods that consume the queue immediately
    builder.single = vi.fn().mockImplementation(() => Promise.resolve(dequeue()));
    builder.maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(dequeue()));

    // Make builder thenable — consumed when awaited without single/maybeSingle
    builder.then = (resolve?: (val: unknown) => unknown, reject?: (err: unknown) => unknown) => {
      const result = dequeue();
      return Promise.resolve(result).then(resolve, reject);
    };

    return builder;
  }

  const fromFn = vi.fn().mockImplementation(() => makeChainable());

  return {
    client: { from: fromFn } as unknown as Parameters<typeof createPurchaseOrder>[0],
    from: fromFn,
    enqueue(result: { data?: unknown; error?: unknown; count?: number }) {
      queue.push(result);
    },
  };
}

// ============================================================
// createPurchaseOrder
// ============================================================
describe('createPurchaseOrder', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('creates PO with auto-generated number and lines', async () => {
    const poRow = {
      id: UUID.po1,
      po_number: 'PO-2026-0001',
      division_id: UUID.div1,
      supplier_id: UUID.supplier1,
      status: 'draft',
      subtotal: 1500,
      tax_amount: 0,
      total_amount: 1500,
      created_by: UUID.user1,
      order_date: '2026-03-20',
      org_id: 'org-1',
      approved_at: null,
      approved_by: null,
      delivery_location_id: null,
      expected_delivery_date: null,
      notes: null,
      project_id: null,
      rfq_bid_id: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    };

    const lineRows = [
      {
        id: UUID.line1,
        po_id: UUID.po1,
        item_id: UUID.item1,
        description: 'Steel beam',
        qty_ordered: 10,
        unit_price: 100,
        line_number: 1,
        line_total: 1000,
        qty_received: 0,
        supplier_part_number: null,
        notes: null,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
      {
        id: UUID.line2,
        po_id: UUID.po1,
        item_id: UUID.item2,
        description: 'Copper wire',
        qty_ordered: 5,
        unit_price: 100,
        line_number: 2,
        line_total: 500,
        qty_received: 0,
        supplier_part_number: null,
        notes: null,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
    ];

    // 1. generatePoNumber → .limit() terminal (thenable)
    mock.enqueue({ data: [], error: null });
    // 2. PO insert → .single()
    mock.enqueue({ data: poRow, error: null });
    // 3. Lines insert → .select() terminal (thenable)
    mock.enqueue({ data: lineRows, error: null });

    const result = await createPurchaseOrder(mock.client, {
      division_id: UUID.div1,
      supplier_id: UUID.supplier1,
      created_by: UUID.user1,
      lines: [
        { item_id: UUID.item1, description: 'Steel beam', qty_ordered: 10, unit_price: 100 },
        { item_id: UUID.item2, description: 'Copper wire', qty_ordered: 5, unit_price: 100 },
      ],
    });

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].description).toBe('Steel beam');
    expect(mock.from).toHaveBeenCalledWith('inventory_purchase_orders');
    expect(mock.from).toHaveBeenCalledWith('inventory_po_lines');
  });

  it('calculates totals correctly', async () => {
    const poRow = {
      id: UUID.po1,
      po_number: 'PO-2026-0001',
      division_id: UUID.div1,
      supplier_id: UUID.supplier1,
      status: 'draft',
      subtotal: 2255,
      tax_amount: 0,
      total_amount: 2255,
      created_by: UUID.user1,
      order_date: '2026-03-20',
      org_id: 'org-1',
      approved_at: null,
      approved_by: null,
      delivery_location_id: null,
      expected_delivery_date: null,
      notes: null,
      project_id: null,
      rfq_bid_id: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    };

    // 1. generatePoNumber
    mock.enqueue({ data: [], error: null });
    // 2. PO insert
    mock.enqueue({ data: poRow, error: null });
    // 3. Lines insert
    mock.enqueue({ data: [], error: null });

    await createPurchaseOrder(mock.client, {
      division_id: UUID.div1,
      supplier_id: UUID.supplier1,
      created_by: UUID.user1,
      lines: [
        { item_id: UUID.item1, description: 'Item A', qty_ordered: 10, unit_price: 25.5 },
        { item_id: UUID.item2, description: 'Item B', qty_ordered: 100, unit_price: 20 },
      ],
    });

    // The second from() call is for insert. Verify insert was called.
    // To verify totals, we check the insert argument on the PO insert call.
    // from('inventory_purchase_orders').insert(poInsert).select().single()
    // The second from() call (index 1) is for PO insert.
    const poInsertChainable = mock.from.mock.results[1].value;
    const insertArg = poInsertChainable.insert.mock.calls[0][0];
    // 10*25.5 = 255, 100*20 = 2000, total = 2255
    expect(insertArg.subtotal).toBe(2255);
    expect(insertArg.tax_amount).toBe(0);
    expect(insertArg.total_amount).toBe(2255);
  });
});

// ============================================================
// submitPo
// ============================================================
describe('submitPo', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('transitions draft → submitted', async () => {
    // 1. fetchPoForTransition → single
    mock.enqueue({ data: { id: UUID.po1, status: 'draft' }, error: null });
    // 2. updatePoStatus → single
    mock.enqueue({ data: { id: UUID.po1, status: 'submitted' }, error: null });

    const result = await submitPo(mock.client, UUID.po1);
    expect(result.status).toBe('submitted');
  });

  it('rejects if not in draft status', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'approved' }, error: null });

    await expect(submitPo(mock.client, UUID.po1)).rejects.toThrow(
      'Cannot submit PO in status "approved". Must be "draft".',
    );
  });
});

// ============================================================
// approvePo
// ============================================================
describe('approvePo', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('transitions submitted → approved with approver info', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'submitted' }, error: null });
    mock.enqueue({
      data: {
        id: UUID.po1,
        status: 'approved',
        approved_by: UUID.user1,
        approved_at: '2026-03-20T12:00:00Z',
      },
      error: null,
    });

    const result = await approvePo(mock.client, UUID.po1, UUID.user1);
    expect(result.status).toBe('approved');
    expect(result.approved_by).toBe(UUID.user1);
  });

  it('rejects if not in submitted status', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'draft' }, error: null });

    await expect(approvePo(mock.client, UUID.po1, UUID.user1)).rejects.toThrow(
      'Cannot approve PO in status "draft". Must be "submitted".',
    );
  });
});

// ============================================================
// cancelPo
// ============================================================
describe('cancelPo', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('works from draft', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'draft' }, error: null });
    mock.enqueue({ data: { id: UUID.po1, status: 'cancelled' }, error: null });

    const result = await cancelPo(mock.client, UUID.po1);
    expect(result.status).toBe('cancelled');
  });

  it('works from submitted', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'submitted' }, error: null });
    mock.enqueue({ data: { id: UUID.po1, status: 'cancelled' }, error: null });

    const result = await cancelPo(mock.client, UUID.po1);
    expect(result.status).toBe('cancelled');
  });

  it('rejects if already approved', async () => {
    mock.enqueue({ data: { id: UUID.po1, status: 'approved' }, error: null });

    await expect(cancelPo(mock.client, UUID.po1)).rejects.toThrow(
      'Cannot cancel PO in status "approved". Must be "draft" or "submitted".',
    );
  });
});

// ============================================================
// getPurchaseOrder
// ============================================================
describe('getPurchaseOrder', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns PO with lines', async () => {
    mock.enqueue({
      data: {
        id: UUID.po1,
        po_number: 'PO-2026-0001',
        status: 'draft',
        inventory_po_lines: [{ id: UUID.line1, po_id: UUID.po1, item_id: UUID.item1 }],
      },
      error: null,
    });

    const result = await getPurchaseOrder(mock.client, UUID.po1);
    expect(result).not.toBeNull();
    expect(result!.lines).toHaveLength(1);
  });

  it('returns null when not found', async () => {
    mock.enqueue({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getPurchaseOrder(mock.client, 'nonexistent');
    expect(result).toBeNull();
  });
});

// ============================================================
// listPurchaseOrders
// ============================================================
describe('listPurchaseOrders', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('returns data with total count', async () => {
    mock.enqueue({
      data: [{ id: UUID.po1, po_number: 'PO-2026-0001' }],
      error: null,
      count: 1,
    });

    const result = await listPurchaseOrders(mock.client, { divisionId: UUID.div1 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ============================================================
// addPoLine
// ============================================================
describe('addPoLine', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('adds a line and recalculates PO totals', async () => {
    const newLine = {
      id: UUID.line2,
      po_id: UUID.po1,
      item_id: UUID.item2,
      description: 'New item',
      qty_ordered: 5,
      unit_price: 20,
      line_number: 2,
      line_total: 100,
      qty_received: 0,
      supplier_part_number: null,
      notes: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    };

    // 1. Query existing line numbers → .limit() terminal (thenable)
    mock.enqueue({ data: [{ line_number: 1 }], error: null });
    // 2. Insert new line → .single()
    mock.enqueue({ data: newLine, error: null });
    // 3. Recalculate: query line totals → thenable (no single)
    mock.enqueue({ data: [{ line_total: 1000 }, { line_total: 100 }], error: null });
    // 4. Update PO totals → thenable (no single)
    mock.enqueue({ error: null });

    const result = await addPoLine(mock.client, UUID.po1, {
      item_id: UUID.item2,
      description: 'New item',
      qty_ordered: 5,
      unit_price: 20,
    });

    expect(result.line_number).toBe(2);
    expect(result.line_total).toBe(100);
  });
});

// ============================================================
// removePoLine
// ============================================================
describe('removePoLine', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
  });

  it('deletes line and recalculates PO totals', async () => {
    // 1. Find line → .single()
    mock.enqueue({ data: { po_id: UUID.po1 }, error: null });
    // 2. Delete line → thenable
    mock.enqueue({ error: null });
    // 3. Recalculate: query remaining lines → thenable
    mock.enqueue({ data: [{ line_total: 1000 }], error: null });
    // 4. Update PO totals → thenable
    mock.enqueue({ error: null });

    await removePoLine(mock.client, UUID.line1);

    expect(mock.from).toHaveBeenCalledWith('inventory_po_lines');
  });
});
