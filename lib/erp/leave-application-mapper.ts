/**
 * Maps KrewPact leave application data to ERPNext Leave Application doctype format.
 * Pure function — no side effects or database calls.
 */

export interface LeaveApplicationMapInput {
  id: string;
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  reason: string | null;
  status: 'Open' | 'Approved' | 'Rejected' | 'Cancelled';
  company: string;
}

/**
 * Map a KrewPact leave application to an ERPNext Leave Application document.
 */
export function mapLeaveApplicationToErp(leave: LeaveApplicationMapInput): Record<string, unknown> {
  return {
    naming_series: 'HR-LAP-.YYYY.-',
    employee: leave.employee,
    leave_type: leave.leave_type,
    from_date: leave.from_date,
    to_date: leave.to_date,
    total_leave_days: leave.total_leave_days,
    description: leave.reason || '',
    status: leave.status,
    company: leave.company,
    krewpact_id: leave.id,
  };
}
