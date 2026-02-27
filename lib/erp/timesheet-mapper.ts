/**
 * Maps KrewPact timesheet batch / time entry data to ERPNext Timesheet doctype format.
 * Pure function — no side effects or database calls.
 */

export interface TimeEntryInput {
  id: string;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  hours: number;
  entry_date: string;
}

export interface TimesheetMapInput {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  currency_code: string | null;
  entries: TimeEntryInput[];
}

/**
 * Map a KrewPact timesheet batch to an ERPNext Timesheet document.
 */
export function mapTimesheetToErp(timesheet: TimesheetMapInput): Record<string, unknown> {
  return {
    employee: timesheet.user_id,
    start_date: timesheet.period_start,
    end_date: timesheet.period_end,
    total_hours: timesheet.total_hours,
    currency: timesheet.currency_code || 'CAD',
    krewpact_id: timesheet.id,
    time_logs: timesheet.entries.map((entry, idx) => ({
      idx: idx + 1,
      activity_type: 'Execution',
      from_time: `${entry.entry_date}T08:00:00`,
      to_time: `${entry.entry_date}T${String(8 + Math.floor(entry.hours)).padStart(2, '0')}:00:00`,
      hours: entry.hours,
      project: entry.project_id || '',
      task: entry.task_id || '',
      description: entry.description || '',
      krewpact_time_entry_id: entry.id,
    })),
  };
}
