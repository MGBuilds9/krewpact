import { describe, it, expect } from 'vitest';
import {
  timeEntryCreateSchema,
  timeEntryUpdateSchema,
  timesheetBatchCreateSchema,
  timesheetBatchApprovalSchema,
  expenseReceiptCreateSchema,
  expenseApprovalSchema,
} from '@/lib/validators/time-expense';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// timeEntryCreateSchema
// ============================================================
describe('timeEntryCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = timeEntryCreateSchema.safeParse({
      user_id: VALID_UUID,
      work_date: '2026-02-26',
      hours_regular: 8,
    });
    expect(result.success).toBe(true);
  });

  it('fails when user_id is missing', () => {
    const result = timeEntryCreateSchema.safeParse({
      work_date: '2026-02-26',
      hours_regular: 8,
    });
    expect(result.success).toBe(false);
  });

  it('fails when hours_regular exceeds 24', () => {
    const result = timeEntryCreateSchema.safeParse({
      user_id: VALID_UUID,
      work_date: '2026-02-26',
      hours_regular: 25,
    });
    expect(result.success).toBe(false);
  });

  it('fails when hours_regular is negative', () => {
    const result = timeEntryCreateSchema.safeParse({
      user_id: VALID_UUID,
      work_date: '2026-02-26',
      hours_regular: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional overtime hours and cost_code', () => {
    const result = timeEntryCreateSchema.safeParse({
      user_id: VALID_UUID,
      work_date: '2026-02-26',
      hours_regular: 8,
      hours_overtime: 2,
      cost_code: '03-100',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// timeEntryUpdateSchema
// ============================================================
describe('timeEntryUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = timeEntryUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with hours_regular only', () => {
    const result = timeEntryUpdateSchema.safeParse({ hours_regular: 7.5 });
    expect(result.success).toBe(true);
  });

  it('fails when hours_overtime exceeds 24', () => {
    const result = timeEntryUpdateSchema.safeParse({ hours_overtime: 25 });
    expect(result.success).toBe(false);
  });

  it('accepts nullable cost_code and notes', () => {
    const result = timeEntryUpdateSchema.safeParse({ cost_code: null, notes: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// timesheetBatchCreateSchema
// ============================================================
describe('timesheetBatchCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = timesheetBatchCreateSchema.safeParse({
      division_id: VALID_UUID,
      period_start: '2026-02-17',
      period_end: '2026-02-23',
    });
    expect(result.success).toBe(true);
  });

  it('fails when division_id is missing', () => {
    const result = timesheetBatchCreateSchema.safeParse({
      period_start: '2026-02-17',
      period_end: '2026-02-23',
    });
    expect(result.success).toBe(false);
  });

  it('fails when division_id is not a valid UUID', () => {
    const result = timesheetBatchCreateSchema.safeParse({
      division_id: 'not-a-uuid',
      period_start: '2026-02-17',
      period_end: '2026-02-23',
    });
    expect(result.success).toBe(false);
  });

  it('fails when period_start is missing', () => {
    const result = timesheetBatchCreateSchema.safeParse({
      division_id: VALID_UUID,
      period_end: '2026-02-23',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// timesheetBatchApprovalSchema
// ============================================================
describe('timesheetBatchApprovalSchema', () => {
  it('accepts valid status', () => {
    const result = timesheetBatchApprovalSchema.safeParse({ status: 'approved' });
    expect(result.success).toBe(true);
  });

  it('fails when status is missing', () => {
    const result = timesheetBatchApprovalSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts all valid status enum values', () => {
    const statuses = ['draft', 'submitted', 'approved', 'rejected', 'exported'] as const;
    for (const status of statuses) {
      expect(timesheetBatchApprovalSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = timesheetBatchApprovalSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// expenseReceiptCreateSchema
// ============================================================
describe('expenseReceiptCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = expenseReceiptCreateSchema.safeParse({
      expense_id: VALID_UUID,
      file_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('fails when expense_id is missing', () => {
    const result = expenseReceiptCreateSchema.safeParse({ file_id: VALID_UUID });
    expect(result.success).toBe(false);
  });

  it('fails when file_id is missing', () => {
    const result = expenseReceiptCreateSchema.safeParse({ expense_id: VALID_UUID });
    expect(result.success).toBe(false);
  });

  it('accepts optional ocr_payload', () => {
    const result = expenseReceiptCreateSchema.safeParse({
      expense_id: VALID_UUID,
      file_id: VALID_UUID,
      ocr_payload: { vendor: 'Home Depot', amount: 245.60, date: '2026-02-26' },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// expenseApprovalSchema
// ============================================================
describe('expenseApprovalSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = expenseApprovalSchema.safeParse({
      expense_id: VALID_UUID,
      decision: 'approved',
    });
    expect(result.success).toBe(true);
  });

  it('fails when expense_id is missing', () => {
    const result = expenseApprovalSchema.safeParse({ decision: 'approved' });
    expect(result.success).toBe(false);
  });

  it('fails when decision is missing', () => {
    const result = expenseApprovalSchema.safeParse({ expense_id: VALID_UUID });
    expect(result.success).toBe(false);
  });

  it('accepts optional reviewer_notes', () => {
    const result = expenseApprovalSchema.safeParse({
      expense_id: VALID_UUID,
      decision: 'rejected',
      reviewer_notes: 'Receipt missing vendor name.',
    });
    expect(result.success).toBe(true);
  });
});
