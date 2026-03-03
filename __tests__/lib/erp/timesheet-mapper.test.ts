import { describe, it, expect } from 'vitest';
import { mapTimesheetToErp, type TimesheetMapInput } from '@/lib/erp/timesheet-mapper';

function makeInput(overrides: Partial<TimesheetMapInput> = {}): TimesheetMapInput {
  return {
    id: 'ts-batch-001',
    user_id: 'user-001',
    period_start: '2026-02-10',
    period_end: '2026-02-16',
    total_hours: 40,
    currency_code: 'CAD',
    entries: [
      {
        id: 'entry-001',
        project_id: 'proj-001',
        task_id: 'task-001',
        description: 'Framing work',
        hours: 8,
        entry_date: '2026-02-10',
      },
      {
        id: 'entry-002',
        project_id: 'proj-001',
        task_id: null,
        description: 'Site cleanup',
        hours: 4,
        entry_date: '2026-02-11',
      },
    ],
    ...overrides,
  };
}

describe('mapTimesheetToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapTimesheetToErp(makeInput());
    expect(result.employee).toBe('user-001');
    expect(result.start_date).toBe('2026-02-10');
    expect(result.end_date).toBe('2026-02-16');
    expect(result.total_hours).toBe(40);
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('ts-batch-001');
  });

  it('maps time log entries correctly', () => {
    const result = mapTimesheetToErp(makeInput());
    const timeLogs = result.time_logs as Record<string, unknown>[];
    expect(timeLogs).toHaveLength(2);
    expect(timeLogs[0].hours).toBe(8);
    expect(timeLogs[0].project).toBe('proj-001');
    expect(timeLogs[0].task).toBe('task-001');
    expect(timeLogs[0].description).toBe('Framing work');
    expect(timeLogs[0].krewpact_time_entry_id).toBe('entry-001');
  });

  it('defaults task to empty string when task_id is null', () => {
    const result = mapTimesheetToErp(makeInput());
    const timeLogs = result.time_logs as Record<string, unknown>[];
    expect(timeLogs[1].task).toBe('');
  });

  it('assigns sequential idx to time log entries', () => {
    const result = mapTimesheetToErp(makeInput());
    const timeLogs = result.time_logs as Record<string, unknown>[];
    expect(timeLogs[0].idx).toBe(1);
    expect(timeLogs[1].idx).toBe(2);
  });

  it('defaults currency to CAD when currency_code is null', () => {
    const result = mapTimesheetToErp(makeInput({ currency_code: null }));
    expect(result.currency).toBe('CAD');
  });

  it('handles empty entries array', () => {
    const result = mapTimesheetToErp(makeInput({ entries: [] }));
    expect(result.time_logs).toEqual([]);
  });

  it('sets activity_type to Execution on all entries', () => {
    const result = mapTimesheetToErp(makeInput());
    const timeLogs = result.time_logs as Record<string, unknown>[];
    timeLogs.forEach((log) => {
      expect(log.activity_type).toBe('Execution');
    });
  });
});
