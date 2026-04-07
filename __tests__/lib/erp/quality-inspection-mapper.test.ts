import { describe, expect, it } from 'vitest';

import {
  mapQualityInspectionToErp,
  type QualityInspectionMapInput,
} from '@/lib/erp/quality-inspection-mapper';

function makeInput(overrides: Partial<QualityInspectionMapInput> = {}): QualityInspectionMapInput {
  return {
    id: 'qi-001',
    inspection_type: 'Incoming',
    reference_type: 'Purchase Receipt',
    reference_name: 'PR-001',
    item_code: 'CABLE-001',
    item_name: 'Copper Cable 12AWG',
    sample_size: 5,
    inspected_by: 'John Smith',
    inspection_date: '2026-03-29',
    remarks: 'Visual inspection passed',
    readings: [
      {
        specification: 'Diameter',
        value: '2.05mm',
        min_value: 2.0,
        max_value: 2.1,
        status: 'Accepted',
      },
    ],
    ...overrides,
  };
}

describe('mapQualityInspectionToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapQualityInspectionToErp(makeInput());
    expect(result.naming_series).toBe('QI-.YYYY.-');
    expect(result.inspection_type).toBe('Incoming');
    expect(result.reference_type).toBe('Purchase Receipt');
    expect(result.reference_name).toBe('PR-001');
    expect(result.item_code).toBe('CABLE-001');
    expect(result.item_name).toBe('Copper Cable 12AWG');
    expect(result.sample_size).toBe(5);
    expect(result.inspected_by).toBe('John Smith');
    expect(result.report_date).toBe('2026-03-29');
    expect(result.krewpact_id).toBe('qi-001');
  });

  it('defaults inspected_by to empty string when null', () => {
    const result = mapQualityInspectionToErp(makeInput({ inspected_by: null }));
    expect(result.inspected_by).toBe('');
  });

  it('defaults remarks to empty string when null', () => {
    const result = mapQualityInspectionToErp(makeInput({ remarks: null }));
    expect(result.remarks).toBe('');
  });

  it('maps readings with sequential idx', () => {
    const result = mapQualityInspectionToErp(makeInput());
    const readings = result.readings as Record<string, unknown>[];
    expect(readings).toHaveLength(1);
    expect(readings[0].idx).toBe(1);
    expect(readings[0].specification).toBe('Diameter');
    expect(readings[0].value).toBe('2.05mm');
    expect(readings[0].min_value).toBe(2.0);
    expect(readings[0].max_value).toBe(2.1);
    expect(readings[0].status).toBe('Accepted');
  });

  it('defaults min_value and max_value to 0 when null', () => {
    const result = mapQualityInspectionToErp(
      makeInput({
        readings: [
          {
            specification: 'Weight',
            value: '500g',
            min_value: null,
            max_value: null,
            status: 'Accepted',
          },
        ],
      }),
    );
    const readings = result.readings as Record<string, unknown>[];
    expect(readings[0].min_value).toBe(0);
    expect(readings[0].max_value).toBe(0);
  });
});
