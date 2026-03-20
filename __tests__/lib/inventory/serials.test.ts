import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/types/supabase';

type SerialRow = Database['public']['Tables']['inventory_serials']['Row'];
type LedgerRow = Database['public']['Tables']['inventory_ledger']['Row'];

import {
  checkoutSerial,
  createSerial,
  getSerial,
  getSerialHistory,
  listSerials,
  returnSerial,
  updateSerialStatus,
} from '@/lib/inventory/serials';

// ============================================================
// Mocks
// ============================================================

vi.mock('@/lib/inventory/ledger', () => ({
  createLedgerEntry: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { createLedgerEntry } from '@/lib/inventory/ledger';

// ============================================================
// Test UUIDs
// ============================================================
const UUID = {
  serial1: '00000000-0000-4000-a000-000000000001',
  item1: '00000000-0000-4000-a000-000000000002',
  div1: '00000000-0000-4000-b000-000000000001',
  loc1: '00000000-0000-4000-8000-000000000001',
  loc2: '00000000-0000-4000-8000-000000000002',
  spot1: '00000000-0000-4000-8000-000000000010',
  user1: '00000000-0000-4000-a000-000000000010',
  user2: '00000000-0000-4000-a000-000000000011',
  proj1: '00000000-0000-4000-9000-000000000001',
  org1: '00000000-0000-4000-a000-000000000020',
  ledger1: '00000000-0000-4000-a100-000000000001',
};

const BASE_SERIAL: SerialRow = {
  id: UUID.serial1,
  item_id: UUID.item1,
  division_id: UUID.div1,
  serial_number: 'SN-001',
  status: 'in_stock' as const,
  current_location_id: UUID.loc1,
  current_spot_id: null,
  checked_out_to: null,
  condition_notes: null,
  acquisition_cost: null,
  almyta_rec_id: null,
  purchase_date: null,
  secondary_serial: null,
  warranty_expiry: null,
  org_id: UUID.org1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const BASE_LEDGER: LedgerRow = {
  id: UUID.ledger1,
  item_id: UUID.item1,
  division_id: UUID.div1,
  transaction_type: 'tool_checkout',
  qty_change: -1,
  valuation_rate: 0,
  value_change: 0,
  location_id: UUID.loc1,
  spot_id: null,
  serial_id: UUID.serial1,
  lot_number: null,
  project_id: null,
  counterpart_location_id: null,
  reason_code: null,
  reference_id: null,
  reference_type: null,
  notes: null,
  transacted_by: UUID.user1,
  transacted_at: '2026-01-01T00:00:00Z',
  org_id: UUID.org1,
  created_at: '2026-01-01T00:00:00Z',
};

// ============================================================
// Mock Supabase client factory
// ============================================================
function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  const from = vi.fn().mockReturnValue(chainable);

  return {
    client: { from } as unknown as Parameters<typeof createSerial>[0],
    from,
    chainable,
  };
}

// ============================================================
// createSerial
// ============================================================
describe('createSerial', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('creates a serial with in_stock status', async () => {
    mock.chainable.single.mockResolvedValue({ data: BASE_SERIAL, error: null });

    const result = await createSerial(mock.client, {
      item_id: UUID.item1,
      division_id: UUID.div1,
      serial_number: 'SN-001',
    });

    expect(result).toEqual(BASE_SERIAL);
    expect(mock.from).toHaveBeenCalledWith('inventory_serials');
    expect(mock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_stock' }),
    );
  });
});

// ============================================================
// getSerial
// ============================================================
describe('getSerial', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('returns serial with item join', async () => {
    mock.chainable.maybeSingle.mockResolvedValue({ data: BASE_SERIAL, error: null });

    const result = await getSerial(mock.client, UUID.serial1);

    expect(result).toEqual(BASE_SERIAL);
    expect(mock.chainable.select).toHaveBeenCalledWith('*, inventory_items(name, sku)');
    expect(mock.chainable.eq).toHaveBeenCalledWith('id', UUID.serial1);
  });
});

// ============================================================
// listSerials
// ============================================================
describe('listSerials', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('applies status filter', async () => {
    // range returns the final query result directly (no .single())
    mock.chainable.range.mockResolvedValue({
      data: [BASE_SERIAL],
      count: 1,
      error: null,
    });

    const result = await listSerials(mock.client, { status: 'in_stock' });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mock.chainable.eq).toHaveBeenCalledWith('status', 'in_stock');
  });

  it('applies search on serial_number', async () => {
    mock.chainable.range.mockResolvedValue({
      data: [BASE_SERIAL],
      count: 1,
      error: null,
    });

    await listSerials(mock.client, { search: 'SN-001' });

    expect(mock.chainable.ilike).toHaveBeenCalledWith('serial_number', '%SN-001%');
  });
});

// ============================================================
// checkoutSerial
// ============================================================
describe('checkoutSerial', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  function setupGetSerial(serial: typeof BASE_SERIAL) {
    // First call = getSerial (maybeSingle), second flow = update (single)
    mock.chainable.maybeSingle.mockResolvedValueOnce({ data: serial, error: null });
  }

  it('creates tool_checkout ledger entry with qty_change = -1', async () => {
    setupGetSerial(BASE_SERIAL);
    const ledger = { ...BASE_LEDGER, transaction_type: 'tool_checkout' as const, qty_change: -1 };
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(ledger);
    const updatedSerial = {
      ...BASE_SERIAL,
      status: 'checked_out' as const,
      checked_out_to: UUID.user2,
    };
    mock.chainable.single.mockResolvedValueOnce({ data: updatedSerial, error: null });

    const result = await checkoutSerial(mock.client, UUID.serial1, {
      checked_out_to: UUID.user2,
      transacted_by: UUID.user1,
    });

    expect(createLedgerEntry).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({
        transaction_type: 'tool_checkout',
        qty_change: -1,
        serial_id: UUID.serial1,
      }),
    );
    expect(result.ledgerEntry.qty_change).toBe(-1);
  });

  it('updates serial status to checked_out', async () => {
    setupGetSerial(BASE_SERIAL);
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(BASE_LEDGER);
    const updatedSerial = {
      ...BASE_SERIAL,
      status: 'checked_out' as const,
      checked_out_to: UUID.user2,
    };
    mock.chainable.single.mockResolvedValueOnce({ data: updatedSerial, error: null });

    const result = await checkoutSerial(mock.client, UUID.serial1, {
      checked_out_to: UUID.user2,
      transacted_by: UUID.user1,
    });

    expect(result.serial.status).toBe('checked_out');
  });

  it('sets checked_out_to', async () => {
    setupGetSerial(BASE_SERIAL);
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(BASE_LEDGER);
    const updatedSerial = {
      ...BASE_SERIAL,
      status: 'checked_out' as const,
      checked_out_to: UUID.user2,
    };
    mock.chainable.single.mockResolvedValueOnce({ data: updatedSerial, error: null });

    const result = await checkoutSerial(mock.client, UUID.serial1, {
      checked_out_to: UUID.user2,
      transacted_by: UUID.user1,
    });

    expect(mock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({ checked_out_to: UUID.user2 }),
    );
    expect(result.serial.checked_out_to).toBe(UUID.user2);
  });

  it('rejects if serial is already checked_out', async () => {
    setupGetSerial({ ...BASE_SERIAL, status: 'checked_out' as const, checked_out_to: UUID.user2 });

    await expect(
      checkoutSerial(mock.client, UUID.serial1, {
        checked_out_to: UUID.user2,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('already checked out');
  });

  it('rejects if serial is decommissioned', async () => {
    setupGetSerial({ ...BASE_SERIAL, status: 'decommissioned' as const });

    await expect(
      checkoutSerial(mock.client, UUID.serial1, {
        checked_out_to: UUID.user2,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('decommissioned');
  });
});

// ============================================================
// returnSerial
// ============================================================
describe('returnSerial', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  const CHECKED_OUT_SERIAL = {
    ...BASE_SERIAL,
    status: 'checked_out' as const,
    checked_out_to: UUID.user2,
  };

  function setupGetSerial(serial: typeof BASE_SERIAL) {
    mock.chainable.maybeSingle.mockResolvedValueOnce({ data: serial, error: null });
  }

  it('creates tool_return ledger entry with qty_change = +1', async () => {
    setupGetSerial(CHECKED_OUT_SERIAL);
    const ledger = { ...BASE_LEDGER, transaction_type: 'tool_return' as const, qty_change: 1 };
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(ledger);
    mock.chainable.single.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, current_location_id: UUID.loc2 },
      error: null,
    });

    const result = await returnSerial(mock.client, UUID.serial1, {
      return_location_id: UUID.loc2,
      transacted_by: UUID.user1,
    });

    expect(createLedgerEntry).toHaveBeenCalledWith(
      mock.client,
      expect.objectContaining({
        transaction_type: 'tool_return',
        qty_change: 1,
        location_id: UUID.loc2,
      }),
    );
    expect(result.ledgerEntry.qty_change).toBe(1);
  });

  it('resets serial status to in_stock', async () => {
    setupGetSerial(CHECKED_OUT_SERIAL);
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(BASE_LEDGER);
    mock.chainable.single.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, status: 'in_stock' },
      error: null,
    });

    const result = await returnSerial(mock.client, UUID.serial1, {
      return_location_id: UUID.loc2,
      transacted_by: UUID.user1,
    });

    expect(result.serial.status).toBe('in_stock');
  });

  it('clears checked_out_to', async () => {
    setupGetSerial(CHECKED_OUT_SERIAL);
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(BASE_LEDGER);
    mock.chainable.single.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, checked_out_to: null },
      error: null,
    });

    const result = await returnSerial(mock.client, UUID.serial1, {
      return_location_id: UUID.loc2,
      transacted_by: UUID.user1,
    });

    expect(mock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({ checked_out_to: null }),
    );
    expect(result.serial.checked_out_to).toBeNull();
  });

  it('updates location to return_location', async () => {
    setupGetSerial(CHECKED_OUT_SERIAL);
    vi.mocked(createLedgerEntry).mockResolvedValueOnce(BASE_LEDGER);
    mock.chainable.single.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, current_location_id: UUID.loc2 },
      error: null,
    });

    const result = await returnSerial(mock.client, UUID.serial1, {
      return_location_id: UUID.loc2,
      transacted_by: UUID.user1,
    });

    expect(mock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({ current_location_id: UUID.loc2 }),
    );
    expect(result.serial.current_location_id).toBe(UUID.loc2);
  });

  it('rejects if serial is not checked_out', async () => {
    setupGetSerial(BASE_SERIAL); // status = in_stock

    await expect(
      returnSerial(mock.client, UUID.serial1, {
        return_location_id: UUID.loc2,
        transacted_by: UUID.user1,
      }),
    ).rejects.toThrow('not checked out');
  });
});

// ============================================================
// getSerialHistory
// ============================================================
describe('getSerialHistory', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('returns ledger entries ordered by date desc', async () => {
    const entries = [
      { ...BASE_LEDGER, id: 'e2', transacted_at: '2026-01-02T00:00:00Z' },
      { ...BASE_LEDGER, id: 'e1', transacted_at: '2026-01-01T00:00:00Z' },
    ];
    // order() is the last chainable before the implicit await
    mock.chainable.order.mockResolvedValueOnce({ data: entries, error: null });

    const result = await getSerialHistory(mock.client, UUID.serial1);

    expect(result).toHaveLength(2);
    expect(mock.chainable.eq).toHaveBeenCalledWith('serial_id', UUID.serial1);
    expect(mock.chainable.order).toHaveBeenCalledWith('transacted_at', { ascending: false });
  });
});

// ============================================================
// updateSerialStatus
// ============================================================
describe('updateSerialStatus', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('transitions in_stock → maintenance', async () => {
    // getSerial call
    mock.chainable.maybeSingle.mockResolvedValueOnce({ data: BASE_SERIAL, error: null });
    // update call
    mock.chainable.single.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, status: 'maintenance' },
      error: null,
    });

    const result = await updateSerialStatus(
      mock.client,
      UUID.serial1,
      'maintenance',
      'Needs repair',
    );

    expect(result.status).toBe('maintenance');
    expect(mock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'maintenance', condition_notes: 'Needs repair' }),
    );
  });

  it('rejects invalid transitions (checked_out → maintenance)', async () => {
    mock.chainable.maybeSingle.mockResolvedValueOnce({
      data: { ...BASE_SERIAL, status: 'checked_out', checked_out_to: UUID.user2 },
      error: null,
    });

    await expect(updateSerialStatus(mock.client, UUID.serial1, 'maintenance')).rejects.toThrow(
      'Cannot transition from checked_out to maintenance',
    );
  });
});
