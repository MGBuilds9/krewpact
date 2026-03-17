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
    time_logs: timesheet.entries.map((entry, idx) => {
      // Calculate to_time from a fixed start of 08:00, capped at 23:59:59
      const startMinutes = 8 * 60;
      const durationMinutes = Math.round(entry.hours * 60);
      const endMinutes = Math.min(startMinutes + durationMinutes, 23 * 60 + 59);
      const endHH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
      const endMM = String(endMinutes % 60).padStart(2, '0');
      return {
        idx: idx + 1,
        activity_type: 'Execution',
        from_time: `${entry.entry_date}T08:00:00`,
        to_time: `${entry.entry_date}T${endHH}:${endMM}:00`,
        hours: entry.hours,
        project: entry.project_id || '',
        task: entry.task_id || '',
        description: entry.description || '',
        krewpact_time_entry_id: entry.id,
      };
    }),
  };
}
