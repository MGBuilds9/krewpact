import { describe, expect, it } from 'vitest';

import { type ItemMapInput, mapItemToErp } from '@/lib/erp/item-mapper';

function makeInput(overrides: Partial<ItemMapInput> = {}): ItemMapInput {
  return {
    id: 'item-001',
    item_code: 'CABLE-001',
    item_name: 'Copper Cable 12AWG',
    item_group: 'Electrical',
    description: '12AWG copper cable, 1000ft spool',
    uom: 'Spool',
    is_stock_item: true,
    is_purchase_item: true,
    is_sales_item: false,
    default_warehouse: 'Main Warehouse',
    ...overrides,
  };
}

describe('mapItemToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapItemToErp(makeInput());
    expect(result.item_code).toBe('CABLE-001');
    expect(result.item_name).toBe('Copper Cable 12AWG');
    expect(result.item_group).toBe('Electrical');
    expect(result.description).toBe('12AWG copper cable, 1000ft spool');
    expect(result.stock_uom).toBe('Spool');
    expect(result.is_stock_item).toBe(1);
    expect(result.is_purchase_item).toBe(1);
    expect(result.is_sales_item).toBe(0);
    expect(result.krewpact_id).toBe('item-001');
    expect(result.country_of_origin).toBe('Canada');
  });

  it('includes default_warehouse when provided', () => {
    const result = mapItemToErp(makeInput());
    expect(result.default_warehouse).toBe('Main Warehouse');
  });

  it('omits default_warehouse when null', () => {
    const result = mapItemToErp(makeInput({ default_warehouse: null }));
    expect(result).not.toHaveProperty('default_warehouse');
  });

  it('defaults item_group to All Item Groups when empty', () => {
    const result = mapItemToErp(makeInput({ item_group: '' }));
    expect(result.item_group).toBe('All Item Groups');
  });

  it('defaults description to item_name when null', () => {
    const result = mapItemToErp(makeInput({ description: null }));
    expect(result.description).toBe('Copper Cable 12AWG');
  });

  it('sets is_sales_item to 1 when true', () => {
    const result = mapItemToErp(makeInput({ is_sales_item: true }));
    expect(result.is_sales_item).toBe(1);
  });

  it('always sets default_material_request_type to Purchase', () => {
    const result = mapItemToErp(makeInput());
    expect(result.default_material_request_type).toBe('Purchase');
  });
});
