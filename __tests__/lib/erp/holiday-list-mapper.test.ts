import { describe, expect, it } from 'vitest';

import { type HolidayListMapInput, mapHolidayListToErp } from '@/lib/erp/holiday-list-mapper';

function makeInput(overrides: Partial<HolidayListMapInput> = {}): HolidayListMapInput {
  return {
    id: 'hl-001',
    holiday_list_name: 'Ontario Statutory 2026',
    from_date: '2026-01-01',
    to_date: '2026-12-31',
    company: 'MDM Group Inc.',
    holidays: [
      { holiday_date: '2026-01-01', description: "New Year's Day" },
      { holiday_date: '2026-07-01', description: 'Canada Day' },
      { holiday_date: '2026-12-25', description: 'Christmas Day' },
    ],
    ...overrides,
  };
}

describe('mapHolidayListToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapHolidayListToErp(makeInput());
    expect(result.holiday_list_name).toBe('Ontario Statutory 2026');
    expect(result.from_date).toBe('2026-01-01');
    expect(result.to_date).toBe('2026-12-31');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.krewpact_id).toBe('hl-001');
  });

  it('maps holidays with sequential idx', () => {
    const result = mapHolidayListToErp(makeInput());
    const holidays = result.holidays as Array<Record<string, unknown>>;
    expect(holidays).toHaveLength(3);
    expect(holidays[0]).toEqual({
      idx: 1,
      holiday_date: '2026-01-01',
      description: "New Year's Day",
    });
    expect(holidays[1]).toEqual({
      idx: 2,
      holiday_date: '2026-07-01',
      description: 'Canada Day',
    });
    expect(holidays[2]).toEqual({
      idx: 3,
      holiday_date: '2026-12-25',
      description: 'Christmas Day',
    });
  });

  it('handles empty holidays array', () => {
    const result = mapHolidayListToErp(makeInput({ holidays: [] }));
    const holidays = result.holidays as Array<Record<string, unknown>>;
    expect(holidays).toHaveLength(0);
  });
});
