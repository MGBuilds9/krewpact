import { describe, expect, it } from 'vitest';

import {
  type LeaveApplicationMapInput,
  mapLeaveApplicationToErp,
} from '@/lib/erp/leave-application-mapper';

function makeInput(overrides: Partial<LeaveApplicationMapInput> = {}): LeaveApplicationMapInput {
  return {
    id: 'leave-001',
    employee: 'HR-EMP-001',
    leave_type: 'Casual Leave',
    from_date: '2026-04-01',
    to_date: '2026-04-03',
    total_leave_days: 3,
    reason: 'Family event',
    status: 'Open',
    company: 'MDM Group Inc.',
    ...overrides,
  };
}

describe('mapLeaveApplicationToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapLeaveApplicationToErp(makeInput());
    expect(result.naming_series).toBe('HR-LAP-.YYYY.-');
    expect(result.employee).toBe('HR-EMP-001');
    expect(result.leave_type).toBe('Casual Leave');
    expect(result.from_date).toBe('2026-04-01');
    expect(result.to_date).toBe('2026-04-03');
    expect(result.total_leave_days).toBe(3);
    expect(result.description).toBe('Family event');
    expect(result.status).toBe('Open');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.krewpact_id).toBe('leave-001');
  });

  it('defaults description to empty string when reason is null', () => {
    const result = mapLeaveApplicationToErp(makeInput({ reason: null }));
    expect(result.description).toBe('');
  });

  it('maps Approved status', () => {
    const result = mapLeaveApplicationToErp(makeInput({ status: 'Approved' }));
    expect(result.status).toBe('Approved');
  });

  it('maps Cancelled status', () => {
    const result = mapLeaveApplicationToErp(makeInput({ status: 'Cancelled' }));
    expect(result.status).toBe('Cancelled');
  });
});
