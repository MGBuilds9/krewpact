import { describe, expect, it } from 'vitest';

import { type BatchMapInput, mapBatchToErp } from '@/lib/erp/batch-mapper';

function makeInput(overrides: Partial<BatchMapInput> = {}): BatchMapInput {
  return {
    id: 'batch-001',
    batch_id: 'BATCH-CABLE-2026-001',
    item_code: 'CABLE-001',
    item_name: 'Copper Cable 12AWG',
    expiry_date: '2027-12-31',
    manufacturing_date: '2026-01-15',
    description: 'Q1 2026 production batch',
    ...overrides,
  };
}

describe('mapBatchToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapBatchToErp(makeInput());
    expect(result.batch_id).toBe('BATCH-CABLE-2026-001');
    expect(result.item).toBe('CABLE-001');
    expect(result.item_name).toBe('Copper Cable 12AWG');
    expect(result.description).toBe('Q1 2026 production batch');
    expect(result.krewpact_id).toBe('batch-001');
    expect(result.expiry_date).toBe('2027-12-31');
    expect(result.manufacturing_date).toBe('2026-01-15');
  });

  it('defaults description to item_name when null', () => {
    const result = mapBatchToErp(makeInput({ description: null }));
    expect(result.description).toBe('Copper Cable 12AWG');
  });

  it('omits expiry_date when null', () => {
    const result = mapBatchToErp(makeInput({ expiry_date: null }));
    expect(result).not.toHaveProperty('expiry_date');
  });

  it('omits manufacturing_date when null', () => {
    const result = mapBatchToErp(makeInput({ manufacturing_date: null }));
    expect(result).not.toHaveProperty('manufacturing_date');
  });

  it('includes both dates when provided', () => {
    const result = mapBatchToErp(makeInput());
    expect(result.expiry_date).toBe('2027-12-31');
    expect(result.manufacturing_date).toBe('2026-01-15');
  });
});
