import { describe, expect, it } from 'vitest';

import { mapUomToErp, type UomMapInput } from '@/lib/erp/uom-mapper';

function makeInput(overrides: Partial<UomMapInput> = {}): UomMapInput {
  return {
    id: 'uom-001',
    uom_name: 'Spool',
    must_be_whole_number: true,
    ...overrides,
  };
}

describe('mapUomToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapUomToErp(makeInput());
    expect(result.uom_name).toBe('Spool');
    expect(result.must_be_whole_number).toBe(1);
    expect(result.krewpact_id).toBe('uom-001');
  });

  it('sets must_be_whole_number to 0 when false', () => {
    const result = mapUomToErp(makeInput({ must_be_whole_number: false }));
    expect(result.must_be_whole_number).toBe(0);
  });

  it('sets must_be_whole_number to 1 when true', () => {
    const result = mapUomToErp(makeInput({ must_be_whole_number: true }));
    expect(result.must_be_whole_number).toBe(1);
  });
});
