import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createVehicle, decommissionVehicle } from '@/lib/inventory/fleet';
import { createItem, deactivateItem, getItem, listItems, updateItem } from '@/lib/inventory/items';
import { createLocation } from '@/lib/inventory/locations';

// ---------------------------------------------------------------------------
// Mock logger to prevent console output in tests
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockResponse = { data: unknown; error: unknown; count?: number | null };

function buildChain(resolveWith: MockResponse) {
  const chain: Record<string, unknown> = {};
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
    'in',
    'ilike',
    'is',
    'or',
    'not',
    'filter',
    'match',
    'order',
    'limit',
    'range',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolveWith);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveWith);
  // For list queries that resolve directly (no single/maybeSingle)
  chain.then = (resolve: (v: MockResponse) => void, _reject?: (e: unknown) => void) =>
    resolve(resolveWith);
  return chain;
}

function buildMockClient(resolveWith: MockResponse) {
  const chain = buildChain(resolveWith);
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  };
}

 
type AnyClient = any;

const ITEM_ROW = {
  id: 'item-1',
  name: 'Cable 14/2',
  sku: 'CBL-142',
  division_id: 'div-1',
  org_id: 'org-1',
  is_active: true,
  tracking_type: 'none' as const,
  valuation_method: 'weighted_average' as const,
  unit_of_measure: 'each' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  created_by: null,
  category_id: null,
  cost_catalog_item_id: null,
  description: null,
  barcode: null,
  manufacturer: null,
  model_number: null,
  part_number_manufacturer: null,
  almyta_part_no: null,
  almyta_short_id: null,
  default_supplier_id: null,
  current_revision: null,
  min_stock_level: null,
  max_stock_level: null,
  reorder_qty: null,
  secondary_uom: null,
  secondary_uom_conversion: null,
  weight_net: null,
  weight_gross: null,
  weight_uom: null,
};

// ---------------------------------------------------------------------------
// Tests: createItem
// ---------------------------------------------------------------------------

describe('createItem', () => {
  it('inserts with correct fields and returns row', async () => {
    const mock = buildMockClient({ data: ITEM_ROW, error: null });

    const result = await createItem(mock as AnyClient, {
      name: 'Cable 14/2',
      sku: 'CBL-142',
      division_id: 'div-1',
    });

    expect(mock.from).toHaveBeenCalledWith('inventory_items');
    expect(mock._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cable 14/2',
        sku: 'CBL-142',
        division_id: 'div-1',
      }),
    );
    expect(result).toEqual(ITEM_ROW);
  });

  it('sets defaults (is_active, tracking_type, valuation_method)', async () => {
    const mock = buildMockClient({ data: ITEM_ROW, error: null });

    await createItem(mock as AnyClient, {
      name: 'Cable 14/2',
      sku: 'CBL-142',
      division_id: 'div-1',
    });

    expect(mock._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        tracking_type: 'none',
        valuation_method: 'weighted_average',
      }),
    );
  });

  it('throws on supabase error', async () => {
    const mock = buildMockClient({
      data: null,
      error: { message: 'insert failed' },
    });

    await expect(
      createItem(mock as AnyClient, {
        name: 'X',
        sku: 'X-1',
        division_id: 'div-1',
      }),
    ).rejects.toEqual({ message: 'insert failed' });
  });
});

// ---------------------------------------------------------------------------
// Tests: updateItem
// ---------------------------------------------------------------------------

describe('updateItem', () => {
  it('updates specified fields only', async () => {
    const updated = { ...ITEM_ROW, name: 'Cable 14/3' };
    const mock = buildMockClient({ data: updated, error: null });

    const result = await updateItem(mock as AnyClient, 'item-1', {
      name: 'Cable 14/3',
    });

    expect(mock._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cable 14/3' }),
    );
    expect(result.name).toBe('Cable 14/3');
  });

  it('strips immutable fields (org_id, created_at, created_by)', async () => {
    const mock = buildMockClient({ data: ITEM_ROW, error: null });

    await updateItem(mock as AnyClient, 'item-1', {
      name: 'Cable 14/3',
      org_id: 'should-be-stripped',
      created_at: '2099-01-01',
      created_by: 'hacker',
    });

    const passedData = (mock._chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(passedData).not.toHaveProperty('org_id');
    expect(passedData).not.toHaveProperty('created_at');
    expect(passedData).not.toHaveProperty('created_by');
    expect(passedData).toHaveProperty('name', 'Cable 14/3');
  });
});

// ---------------------------------------------------------------------------
// Tests: getItem
// ---------------------------------------------------------------------------

describe('getItem', () => {
  it('returns item when found', async () => {
    const mock = buildMockClient({ data: ITEM_ROW, error: null });

    const result = await getItem(mock as AnyClient, 'item-1');

    expect(mock.from).toHaveBeenCalledWith('inventory_items');
    expect(mock._chain.select).toHaveBeenCalledWith('*, inventory_item_categories(name)');
    expect(result).toEqual(ITEM_ROW);
  });

  it('returns null when not found', async () => {
    const mock = buildMockClient({ data: null, error: null });

    const result = await getItem(mock as AnyClient, 'nonexistent');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: listItems
// ---------------------------------------------------------------------------

describe('listItems', () => {
  it('applies pagination', async () => {
    const mock = buildMockClient({
      data: [ITEM_ROW],
      error: null,
      count: 1,
    });

    // Override: list queries resolve the chain itself, not .single()
    const chain = mock._chain;
    const listResponse = { data: [ITEM_ROW], error: null, count: 1 };
    chain.range = vi.fn().mockResolvedValue(listResponse);

    const result = await listItems(mock as AnyClient, {
      limit: 10,
      offset: 20,
    });

    expect(chain.range).toHaveBeenCalledWith(20, 29);
    expect(result.data).toEqual([ITEM_ROW]);
    expect(result.total).toBe(1);
  });

  it('applies search filter', async () => {
    const mock = buildMockClient({ data: [], error: null, count: 0 });
    const chain = mock._chain;
    chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    await listItems(mock as AnyClient, { search: 'cable' });

    expect(chain.or).toHaveBeenCalledWith('name.ilike.%cable%,sku.ilike.%cable%');
  });

  it('applies division filter', async () => {
    const mock = buildMockClient({ data: [], error: null, count: 0 });
    const chain = mock._chain;
    chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    await listItems(mock as AnyClient, { divisionId: 'div-telecom' });

    expect(chain.eq).toHaveBeenCalledWith('division_id', 'div-telecom');
  });

  it('uses default limit 25 and offset 0', async () => {
    const mock = buildMockClient({ data: [], error: null, count: 0 });
    const chain = mock._chain;
    chain.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });

    await listItems(mock as AnyClient, {});

    expect(chain.range).toHaveBeenCalledWith(0, 24);
  });
});

// ---------------------------------------------------------------------------
// Tests: deactivateItem
// ---------------------------------------------------------------------------

describe('deactivateItem', () => {
  it('sets is_active to false', async () => {
    const deactivated = { ...ITEM_ROW, is_active: false };
    const mock = buildMockClient({ data: deactivated, error: null });

    const result = await deactivateItem(mock as AnyClient, 'item-1');

    expect(mock._chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(result.is_active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: createLocation validation
// ---------------------------------------------------------------------------

describe('createLocation', () => {
  it('validates vehicle requires linked_vehicle_id', async () => {
    const mock = buildMockClient({ data: null, error: null });

    await expect(
      createLocation(mock as AnyClient, {
        name: 'Truck 1',
        location_type: 'vehicle',
        division_id: 'div-1',
        // no linked_vehicle_id
      }),
    ).rejects.toThrow('Vehicle locations require a linked_vehicle_id');
  });

  it('validates job_site requires project_id', async () => {
    const mock = buildMockClient({ data: null, error: null });

    await expect(
      createLocation(mock as AnyClient, {
        name: 'Site A',
        location_type: 'job_site',
        division_id: 'div-1',
        // no project_id
      }),
    ).rejects.toThrow('Job site locations require a project_id');
  });

  it('allows warehouse without linked_vehicle_id or project_id', async () => {
    const locationRow = {
      id: 'loc-1',
      name: 'Main Warehouse',
      location_type: 'warehouse',
      division_id: 'div-1',
      org_id: 'org-1',
      is_active: true,
      linked_vehicle_id: null,
      parent_location_id: null,
      project_id: null,
      address: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
      updated_at: '2026-01-01T00:00:00Z',
    };
    const mock = buildMockClient({ data: locationRow, error: null });

    const result = await createLocation(mock as AnyClient, {
      name: 'Main Warehouse',
      location_type: 'warehouse',
      division_id: 'div-1',
    });

    expect(result.name).toBe('Main Warehouse');
  });
});

// ---------------------------------------------------------------------------
// Tests: createVehicle with auto-location
// ---------------------------------------------------------------------------

describe('createVehicle', () => {
  it('auto-creates location when flag is true', async () => {
    const vehicleRow = {
      id: 'v-1',
      unit_number: 'T-100',
      division_id: 'div-1',
      org_id: 'org-1',
      vehicle_type: 'truck' as const,
      status: 'active' as const,
      ownership_type: 'owned' as const,
      is_active: true,
      make: null,
      model: null,
      year: null,
      vin: null,
      license_plate: null,
      insurance_expiry: null,
      acquisition_date: null,
      assigned_to: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
      updated_at: '2026-01-01T00:00:00Z',
    };
    const locationRow = {
      id: 'loc-1',
      name: 'Vehicle - T-100',
      location_type: 'vehicle' as const,
      linked_vehicle_id: 'v-1',
      division_id: 'div-1',
      org_id: 'org-1',
      is_active: true,
      parent_location_id: null,
      project_id: null,
      address: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
      updated_at: '2026-01-01T00:00:00Z',
    };

    // Build a client that returns vehicleRow on first from() call, locationRow on second
    let callCount = 0;
    const vehicleChain = buildChain({ data: vehicleRow, error: null });
    const locationChain = buildChain({ data: locationRow, error: null });
    const client = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? vehicleChain : locationChain;
      }),
    };

    const result = await createVehicle(
      client as AnyClient,
      { unit_number: 'T-100', division_id: 'div-1' },
      true,
    );

    expect(result.vehicle).toEqual(vehicleRow);
    expect(result.location).toEqual(locationRow);
    expect(client.from).toHaveBeenCalledWith('fleet_vehicles');
    expect(client.from).toHaveBeenCalledWith('inventory_locations');
    expect(locationChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vehicle - T-100',
        location_type: 'vehicle',
        linked_vehicle_id: 'v-1',
      }),
    );
  });

  it('skips location creation when autoCreateLocation is false', async () => {
    const vehicleRow = {
      id: 'v-2',
      unit_number: 'V-200',
      division_id: 'div-1',
      org_id: 'org-1',
      vehicle_type: 'van' as const,
      status: 'active' as const,
      ownership_type: 'owned' as const,
      is_active: true,
      make: null,
      model: null,
      year: null,
      vin: null,
      license_plate: null,
      insurance_expiry: null,
      acquisition_date: null,
      assigned_to: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
      updated_at: '2026-01-01T00:00:00Z',
    };
    const mock = buildMockClient({ data: vehicleRow, error: null });

    const result = await createVehicle(
      mock as AnyClient,
      { unit_number: 'V-200', division_id: 'div-1' },
      false,
    );

    expect(result.vehicle).toEqual(vehicleRow);
    expect(result.location).toBeUndefined();
    expect(mock.from).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: decommissionVehicle
// ---------------------------------------------------------------------------

describe('decommissionVehicle', () => {
  it('deactivates linked location', async () => {
    const decommissioned = {
      id: 'v-1',
      unit_number: 'T-100',
      division_id: 'div-1',
      org_id: 'org-1',
      vehicle_type: 'truck' as const,
      status: 'decommissioned' as const,
      ownership_type: 'owned' as const,
      is_active: false,
      make: null,
      model: null,
      year: null,
      vin: null,
      license_plate: null,
      insurance_expiry: null,
      acquisition_date: null,
      assigned_to: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      created_by: null,
      updated_at: '2026-01-01T00:00:00Z',
    };

    // First call: update fleet_vehicles → single() returns vehicle
    // Second call: update inventory_locations → resolves { data: null, error: null }
    let callCount = 0;
    const vehicleChain = buildChain({ data: decommissioned, error: null });
    const locationChain = buildChain({ data: null, error: null });
    // For the location update, no .single() is called — it resolves from the chain directly
    locationChain.eq = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? vehicleChain : locationChain;
      }),
    };

    const result = await decommissionVehicle(client as AnyClient, 'v-1');

    expect(result.status).toBe('decommissioned');
    expect(result.is_active).toBe(false);
    expect(client.from).toHaveBeenCalledWith('fleet_vehicles');
    expect(client.from).toHaveBeenCalledWith('inventory_locations');
    expect(vehicleChain.update).toHaveBeenCalledWith({
      status: 'decommissioned',
      is_active: false,
    });
    expect(locationChain.update).toHaveBeenCalledWith({ is_active: false });
  });
});
