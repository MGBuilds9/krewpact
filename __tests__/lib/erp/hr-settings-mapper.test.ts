import { describe, expect, it } from 'vitest';

import { mapHrSettingsFromErp, mapHrSettingsToErp } from '@/lib/erp/hr-settings-mapper';

describe('mapHrSettingsFromErp', () => {
  it('maps all fields correctly', () => {
    const result = mapHrSettingsFromErp({
      name: 'HR Settings',
      retirement_age: 65,
      standard_working_hours: 8,
      leave_approval_notification_template: 'Leave Approval',
      leave_status_notification_template: 'Leave Status',
      emp_created_by: 'Naming Series',
      creation: '2026-01-01T00:00:00',
      modified: '2026-01-01T00:00:00',
    });

    expect(result.retirement_age).toBe(65);
    expect(result.standard_working_hours).toBe(8);
    expect(result.emp_created_by).toBe('Naming Series');
  });
});

describe('mapHrSettingsToErp', () => {
  it('maps provided fields only', () => {
    const result = mapHrSettingsToErp({ retirement_age: 60 });
    expect(result.retirement_age).toBe(60);
    expect(result).not.toHaveProperty('standard_working_hours');
  });

  it('maps both fields when provided', () => {
    const result = mapHrSettingsToErp({
      retirement_age: 60,
      standard_working_hours: 7,
    });
    expect(result.retirement_age).toBe(60);
    expect(result.standard_working_hours).toBe(7);
  });

  it('returns empty object when nothing provided', () => {
    const result = mapHrSettingsToErp({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
