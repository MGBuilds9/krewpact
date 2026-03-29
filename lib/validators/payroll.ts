import { z } from 'zod';

// ============================================================
// Payroll export schemas
// ============================================================

export const payrollExportStatusValues = [
  'pending',
  'processing',
  'completed',
  'failed',
  'reconciled',
] as const;

export const payrollExportStatus = z.enum(payrollExportStatusValues);

export const payrollExportCreateSchema = z.object({
  period_start: z.string().min(1, 'Period start is required'),
  period_end: z.string().min(1, 'Period end is required'),
  division_ids: z.array(z.string().uuid()).min(1, 'At least one division is required'),
});

export const payrollExportQuerySchema = z.object({
  status: payrollExportStatus.optional(),
  division_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const payrollReconcileSchema = z.object({
  csv_content: z.string().min(1, 'CSV content is required'),
});

// ============================================================
// ADP field mapping schemas
// ============================================================

export const adpFieldMappingSchema = z.object({
  internal_field: z.string().min(1),
  adp_field: z.string().min(1),
  transform_rule: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

// ============================================================
// Payroll export row schema
// ============================================================

export const payrollExportRowSchema = z.object({
  employee_id: z.string().min(1),
  employee_name: z.string().optional(),
  hours_regular: z.number().min(0),
  hours_overtime: z.number().min(0),
  cost_code: z.string().optional(),
  pay_rate: z.number().min(0).optional(),
  department: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type PayrollExportStatus = z.infer<typeof payrollExportStatus>;
export type PayrollExportCreate = z.infer<typeof payrollExportCreateSchema>;
export type PayrollExportQuery = z.infer<typeof payrollExportQuerySchema>;
export type PayrollReconcile = z.infer<typeof payrollReconcileSchema>;
export type AdpFieldMapping = z.infer<typeof adpFieldMappingSchema>;
export type PayrollExportRow = z.infer<typeof payrollExportRowSchema>;
