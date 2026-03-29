import { describe, expect, it } from 'vitest';

import { type AttendanceMapInput, mapAttendanceToErp } from '@/lib/erp/attendance-mapper';

function makeInput(overrides: Partial<AttendanceMapInput> = {}): AttendanceMapInput {
  return {
    id: 'att-001',
    employee: 'HR-EMP-001',
    attendance_date: '2026-03-29',
    status: 'Present',
    leave_type: null,
    company: 'MDM Group Inc.',
    shift: null,
    ...overrides,
  };
}

describe('mapAttendanceToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapAttendanceToErp(makeInput());
    expect(result.naming_series).toBe('HR-ATT-.YYYY.-');
    expect(result.employee).toBe('HR-EMP-001');
    expect(result.attendance_date).toBe('2026-03-29');
    expect(result.status).toBe('Present');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.krewpact_id).toBe('att-001');
  });

  it('includes leave_type when provided', () => {
    const result = mapAttendanceToErp(makeInput({ leave_type: 'Casual Leave' }));
    expect(result.leave_type).toBe('Casual Leave');
  });

  it('omits leave_type when null', () => {
    const result = mapAttendanceToErp(makeInput());
    expect(result).not.toHaveProperty('leave_type');
  });

  it('includes shift when provided', () => {
    const result = mapAttendanceToErp(makeInput({ shift: 'Morning' }));
    expect(result.shift).toBe('Morning');
  });

  it('omits shift when null', () => {
    const result = mapAttendanceToErp(makeInput());
    expect(result).not.toHaveProperty('shift');
  });

  it('maps Half Day status', () => {
    const result = mapAttendanceToErp(makeInput({ status: 'Half Day' }));
    expect(result.status).toBe('Half Day');
  });
});
