/**
 * Maps KrewPact attendance data to ERPNext Attendance doctype format.
 * Pure function — no side effects or database calls.
 */

export interface AttendanceMapInput {
  id: string;
  employee: string;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Work From Home';
  leave_type: string | null;
  company: string;
  shift: string | null;
}

/**
 * Map a KrewPact attendance record to an ERPNext Attendance document.
 */
export function mapAttendanceToErp(att: AttendanceMapInput): Record<string, unknown> {
  return {
    naming_series: 'HR-ATT-.YYYY.-',
    employee: att.employee,
    attendance_date: att.attendance_date,
    status: att.status,
    company: att.company,
    krewpact_id: att.id,
    ...(att.leave_type ? { leave_type: att.leave_type } : {}),
    ...(att.shift ? { shift: att.shift } : {}),
  };
}
