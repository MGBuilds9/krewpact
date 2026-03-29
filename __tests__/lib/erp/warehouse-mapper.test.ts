import { describe, expect, it } from 'vitest';

import { mapWarehouseToErp, type WarehouseMapInput } from '@/lib/erp/warehouse-mapper';

function makeInput(overrides: Partial<WarehouseMapInput> = {}): WarehouseMapInput {
  return {
    id: 'wh-001',
    warehouse_name: 'Main Warehouse',
    warehouse_type: 'Warehouse',
    parent_warehouse: 'All Warehouses',
    company: 'MDM Group Inc.',
    is_group: false,
    ...overrides,
  };
}

describe('mapWarehouseToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapWarehouseToErp(makeInput());
    expect(result.warehouse_name).toBe('Main Warehouse');
    expect(result.warehouse_type).toBe('Warehouse');
    expect(result.parent_warehouse).toBe('All Warehouses');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.is_group).toBe(0);
    expect(result.krewpact_id).toBe('wh-001');
  });

  it('sets is_group to 1 when true', () => {
    const result = mapWarehouseToErp(makeInput({ is_group: true }));
    expect(result.is_group).toBe(1);
  });

  it('defaults warehouse_type to Warehouse when null', () => {
    const result = mapWarehouseToErp(makeInput({ warehouse_type: null }));
    expect(result.warehouse_type).toBe('Warehouse');
  });

  it('defaults parent_warehouse to empty string when null', () => {
    const result = mapWarehouseToErp(makeInput({ parent_warehouse: null }));
    expect(result.parent_warehouse).toBe('');
  });
});
