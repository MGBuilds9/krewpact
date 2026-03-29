import { describe, expect, it } from 'vitest';

import { mapSerialNoToErp, type SerialNoMapInput } from '@/lib/erp/serial-no-mapper';

function makeInput(overrides: Partial<SerialNoMapInput> = {}): SerialNoMapInput {
  return {
    id: 'sn-001',
    serial_no: 'SN-CABLE-001-0001',
    item_code: 'CABLE-001',
    item_name: 'Copper Cable 12AWG',
    warehouse: 'Main Warehouse',
    status: 'Active',
    purchase_date: '2026-03-15',
    warranty_expiry_date: '2027-03-15',
    description: 'Serial tracked cable spool',
    ...overrides,
  };
}

describe('mapSerialNoToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapSerialNoToErp(makeInput());
    expect(result.serial_no).toBe('SN-CABLE-001-0001');
    expect(result.item_code).toBe('CABLE-001');
    expect(result.item_name).toBe('Copper Cable 12AWG');
    expect(result.warehouse).toBe('Main Warehouse');
    expect(result.status).toBe('Active');
    expect(result.description).toBe('Serial tracked cable spool');
    expect(result.krewpact_id).toBe('sn-001');
    expect(result.purchase_date).toBe('2026-03-15');
    expect(result.warranty_expiry_date).toBe('2027-03-15');
  });

  it('defaults warehouse to empty string when null', () => {
    const result = mapSerialNoToErp(makeInput({ warehouse: null }));
    expect(result.warehouse).toBe('');
  });

  it('defaults description to item_name when null', () => {
    const result = mapSerialNoToErp(makeInput({ description: null }));
    expect(result.description).toBe('Copper Cable 12AWG');
  });

  it('omits purchase_date when null', () => {
    const result = mapSerialNoToErp(makeInput({ purchase_date: null }));
    expect(result).not.toHaveProperty('purchase_date');
  });

  it('omits warranty_expiry_date when null', () => {
    const result = mapSerialNoToErp(makeInput({ warranty_expiry_date: null }));
    expect(result).not.toHaveProperty('warranty_expiry_date');
  });

  it('supports all status values', () => {
    const statuses: SerialNoMapInput['status'][] = [
      'Active',
      'Inactive',
      'Delivered',
      'Expired',
    ];
    for (const status of statuses) {
      const result = mapSerialNoToErp(makeInput({ status }));
      expect(result.status).toBe(status);
    }
  });
});
