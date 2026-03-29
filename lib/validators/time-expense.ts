import { z } from 'zod';

// ============================================================
// Time entry schemas
// ============================================================

export const timeEntryCreateSchema = z.object({
  task_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  work_date: z.string().min(1),
  hours_regular: z.number().min(0).max(24),
  hours_overtime: z.number().min(0).max(24).optional(),
  cost_code: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export const timeEntryUpdateSchema = z.object({
  hours_regular: z.number().min(0).max(24).optional(),
  hours_overtime: z.number().min(0).max(24).optional(),
  cost_code: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Offline sync: optimistic version for conflict detection */
  version: z.number().int().optional(),
});

// ============================================================
// Timesheet batch schemas
// ============================================================

const timesheetStatuses = ['draft', 'submitted', 'approved', 'rejected', 'exported'] as const;

export const timesheetBatchCreateSchema = z.object({
  division_id: z.string().uuid(),
  period_start: z.string().min(1),
  period_end: z.string().min(1),
});

export const timesheetBatchApprovalSchema = z.object({
  status: z.enum(timesheetStatuses),
});

// ============================================================
// Expense receipt schemas
// ============================================================

export const expenseReceiptCreateSchema = z.object({
  expense_id: z.string().uuid(),
  file_id: z.string().uuid(),
  ocr_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Expense approval schemas
// ============================================================

export const expenseApprovalSchema = z.object({
  expense_id: z.string().uuid(),
  decision: z.string().min(1),
  reviewer_notes: z.string().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type TimeEntryCreate = z.infer<typeof timeEntryCreateSchema>;
export type TimeEntryUpdate = z.infer<typeof timeEntryUpdateSchema>;
export type TimesheetBatchCreate = z.infer<typeof timesheetBatchCreateSchema>;
export type TimesheetBatchApproval = z.infer<typeof timesheetBatchApprovalSchema>;
export type ExpenseReceiptCreate = z.infer<typeof expenseReceiptCreateSchema>;
export type ExpenseApproval = z.infer<typeof expenseApprovalSchema>;
