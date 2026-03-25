import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import {
  approveBatch,
  createBatch,
  exportToADP,
  rejectBatch,
  submitBatch,
} from '@/lib/services/payroll';

const TEST_BATCH_ID = '00000000-0000-4000-a000-000000000001';
const TEST_DIVISION_ID = '00000000-0000-4000-a000-000000000002';
const TEST_USER_ID = '00000000-0000-4000-a000-000000000099';

function makeBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_BATCH_ID,
    division_id: TEST_DIVISION_ID,
    period_start: '2026-03-09',
    period_end: '2026-03-22',
    status: 'draft',
    submitted_by: TEST_USER_ID,
    approved_by: null,
    exported_at: null,
    adp_export_reference: null,
    created_at: '2026-03-25T00:00:00Z',
    updated_at: '2026-03-25T00:00:00Z',
    ...overrides,
  };
}

function makeTimeEntry(overrides: Record<string, unknown> = {}) {
  return {
    user_id: TEST_USER_ID,
    work_date: '2026-03-10',
    hours_regular: 8,
    hours_overtime: 0,
    cost_code: 'CC-001',
    project_id: 'proj-123',
    ...overrides,
  };
}

describe('createBatch', () => {
  it('inserts a draft batch and returns it', async () => {
    const batch = makeBatch();
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: batch, error: null } },
    });

    const result = await createBatch(supabase as never, {
      divisionId: TEST_DIVISION_ID,
      periodStart: '2026-03-09',
      periodEnd: '2026-03-22',
      submittedBy: TEST_USER_ID,
      entries: [],
    });

    expect(result).toEqual(batch);
    expect(supabase.from).toHaveBeenCalledWith('timesheet_batches');
  });

  it('throws when supabase returns an error', async () => {
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: null, error: { message: 'DB error' } } },
    });

    await expect(
      createBatch(supabase as never, {
        divisionId: TEST_DIVISION_ID,
        periodStart: '2026-03-09',
        periodEnd: '2026-03-22',
        submittedBy: TEST_USER_ID,
        entries: [],
      }),
    ).rejects.toThrow('Failed to create batch');
  });
});

describe('submitBatch', () => {
  it('updates status to submitted', async () => {
    const batch = makeBatch({ status: 'submitted' });
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: batch, error: null } },
    });

    const result = await submitBatch(supabase as never, TEST_BATCH_ID);
    expect(result.status).toBe('submitted');
  });

  it('throws on DB error', async () => {
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: null, error: { message: 'not found' } } },
    });

    await expect(submitBatch(supabase as never, TEST_BATCH_ID)).rejects.toThrow(
      'Failed to submit batch',
    );
  });
});

describe('approveBatch', () => {
  it('updates status to approved with approverId', async () => {
    const batch = makeBatch({ status: 'approved', approved_by: TEST_USER_ID });
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: batch, error: null } },
    });

    const result = await approveBatch(supabase as never, TEST_BATCH_ID, TEST_USER_ID);
    expect(result.status).toBe('approved');
    expect(result.approved_by).toBe(TEST_USER_ID);
  });
});

describe('rejectBatch', () => {
  it('updates status to rejected with reason in adp_export_reference', async () => {
    const reason = 'Missing overtime entries';
    const batch = makeBatch({
      status: 'rejected',
      approved_by: TEST_USER_ID,
      adp_export_reference: `REJECTED: ${reason}`,
    });
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: batch, error: null } },
    });

    const result = await rejectBatch(supabase as never, TEST_BATCH_ID, TEST_USER_ID, reason);
    expect(result.status).toBe('rejected');
    expect(result.adp_export_reference).toContain(reason);
  });
});

describe('exportToADP', () => {
  it('returns CSV with header and data rows', async () => {
    const batch = makeBatch({ status: 'approved' });
    const entries = [
      makeTimeEntry({ hours_regular: 8, hours_overtime: 2 }),
      makeTimeEntry({ hours_regular: 6, hours_overtime: 0, work_date: '2026-03-11' }),
    ];

    const supabase = mockSupabaseClient({
      tables: {
        timesheet_batches: { data: batch, error: null },
        time_entries: { data: entries, error: null },
      },
    });

    const csv = await exportToADP(supabase as never, TEST_BATCH_ID);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Employee ID,Date,Hours,Type,Project Code');
    // 2 REG rows + 1 OT row = 3 data rows
    expect(lines.length).toBe(4);
    expect(csv).toContain('REG');
    expect(csv).toContain('OT');
  });

  it('throws when batch is not approved', async () => {
    const batch = makeBatch({ status: 'submitted' });
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: batch, error: null } },
    });

    await expect(exportToADP(supabase as never, TEST_BATCH_ID)).rejects.toThrow(
      'Batch must be approved',
    );
  });

  it('throws when batch is not found', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        timesheet_batches: { data: null, error: { message: 'not found' } },
      },
    });

    await expect(exportToADP(supabase as never, TEST_BATCH_ID)).rejects.toThrow('Batch not found');
  });

  it('generates only REG rows when no overtime', async () => {
    const batch = makeBatch({ status: 'approved' });
    const entries = [makeTimeEntry({ hours_regular: 8, hours_overtime: 0 })];

    const supabase = mockSupabaseClient({
      tables: {
        timesheet_batches: { data: batch, error: null },
        time_entries: { data: entries, error: null },
      },
    });

    const csv = await exportToADP(supabase as never, TEST_BATCH_ID);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 REG row
    expect(csv).not.toContain('OT');
  });
});
