import { z } from 'zod';

// ============================================================
// Invoice snapshot schemas
// ============================================================

const invoiceStatuses = ['draft', 'submitted', 'paid', 'overdue', 'cancelled'] as const;

export const invoiceSnapshotSchema = z.object({
  invoice_number: z.string().min(1),
  customer_name: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(invoiceStatuses).optional(),
  subtotal_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total_amount: z.number().optional(),
  amount_paid: z.number().optional(),
  payment_link_url: z.string().url().optional(),
  erp_docname: z.string().optional(),
  snapshot_payload: z.record(z.string(), z.unknown()),
});

// ============================================================
// PO snapshot schemas
// ============================================================

const poStatuses = ['draft', 'submitted', 'approved', 'received', 'closed', 'cancelled'] as const;

export const poSnapshotSchema = z.object({
  po_number: z.string().min(1),
  supplier_name: z.string().optional(),
  po_date: z.string().optional(),
  status: z.enum(poStatuses).optional(),
  subtotal_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total_amount: z.number().optional(),
  erp_docname: z.string().optional(),
  snapshot_payload: z.record(z.string(), z.unknown()),
});

// ============================================================
// Job cost snapshot schemas
// ============================================================

export const jobCostSnapshotSchema = z.object({
  snapshot_date: z.string().min(1),
  baseline_budget: z.number().optional(),
  revised_budget: z.number().optional(),
  committed_cost: z.number().optional(),
  actual_cost: z.number().optional(),
  forecast_cost: z.number().optional(),
  forecast_margin_pct: z.number().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type InvoiceSnapshot = z.infer<typeof invoiceSnapshotSchema>;
export type POSnapshot = z.infer<typeof poSnapshotSchema>;
export type JobCostSnapshot = z.infer<typeof jobCostSnapshotSchema>;
