import { z } from 'zod';

// ============================================================
// Selection sheet schemas
// ============================================================

export const selectionSheetCreateSchema = z.object({
  sheet_name: z.string().min(1).max(200),
});

export const selectionSheetUpdateSchema = z.object({
  sheet_name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'issued', 'client_review', 'approved', 'locked']).optional(),
});

// ============================================================
// Selection option schemas
// ============================================================

export const selectionOptionSchema = z.object({
  option_group: z.string().min(1),
  option_name: z.string().min(1),
  allowance_amount: z.number().min(0).optional(),
  upgrade_amount: z.number().min(0).optional(),
  sort_order: z.number().int().optional(),
});

// ============================================================
// Selection choice schemas
// ============================================================

export const selectionChoiceSchema = z.object({
  selection_option_id: z.string().uuid(),
  quantity: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ============================================================
// Allowance reconciliation schemas
// ============================================================

export const allowanceReconciliationSchema = z.object({
  category_name: z.string().min(1),
  allowance_budget: z.number().min(0),
  selected_cost: z.number().min(0),
  variance: z.number(),
});

// ============================================================
// Inferred types
// ============================================================

export type SelectionSheetCreate = z.infer<typeof selectionSheetCreateSchema>;
export type SelectionSheetUpdate = z.infer<typeof selectionSheetUpdateSchema>;
export type SelectionOption = z.infer<typeof selectionOptionSchema>;
export type SelectionChoice = z.infer<typeof selectionChoiceSchema>;
export type AllowanceReconciliation = z.infer<typeof allowanceReconciliationSchema>;
