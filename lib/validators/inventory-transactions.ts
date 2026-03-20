import { z } from 'zod';

import { optionalSafeString } from '@/lib/sanitize';

// ============================================================
// Transaction type enum
// ============================================================

export const transactionTypeValues = [
  'purchase_receipt',
  'purchase_return',
  'material_issue',
  'material_return',
  'stock_transfer',
  'stock_adjustment',
  'scrap',
  'tool_checkout',
  'tool_return',
  'initial_stock',
] as const;

// ============================================================
// createTransactionSchema
// ============================================================

export const createTransactionSchema = z
  .object({
    item_id: z.string().uuid(),
    division_id: z.string().uuid(),
    transaction_type: z.enum(transactionTypeValues),
    qty_change: z.number().refine((v) => v !== 0, { message: 'qty_change must not be zero' }),
    location_id: z.string().uuid(),
    valuation_rate: z.number().min(0).optional(),
    spot_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    serial_id: z.string().uuid().optional(),
    lot_number: optionalSafeString(),
    counterpart_location_id: z.string().uuid().optional(),
    reason_code: optionalSafeString(),
    notes: optionalSafeString(),
  })
  .refine(
    (data) =>
      !['material_issue', 'material_return'].includes(data.transaction_type) ||
      data.project_id !== undefined,
    {
      message: 'project_id is required for material_issue and material_return',
      path: ['project_id'],
    },
  )
  .refine(
    (data) =>
      data.transaction_type !== 'stock_transfer' || data.counterpart_location_id !== undefined,
    {
      message: 'counterpart_location_id is required for stock_transfer',
      path: ['counterpart_location_id'],
    },
  )
  .refine(
    (data) =>
      !['stock_adjustment', 'scrap'].includes(data.transaction_type) ||
      (data.reason_code !== undefined && data.reason_code.length > 0),
    {
      message: 'reason_code is required for stock_adjustment and scrap',
      path: ['reason_code'],
    },
  );

// ============================================================
// Inferred types
// ============================================================

export type CreateTransaction = z.infer<typeof createTransactionSchema>;
