import { z } from 'zod';

import { optionalSafeString, safeString } from '@/lib/sanitize';

// ============================================================
// poLineSchema
// ============================================================

export const poLineSchema = z.object({
  item_id: z.string().uuid(),
  description: safeString().pipe(z.string().min(1)),
  qty_ordered: z.number().gt(0),
  unit_price: z.number().min(0),
  supplier_part_number: optionalSafeString(),
  notes: optionalSafeString(),
});

// ============================================================
// createPurchaseOrderSchema
// ============================================================

export const createPurchaseOrderSchema = z.object({
  division_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  expected_delivery_date: z.string().optional(),
  delivery_location_id: z.string().uuid().optional(),
  notes: optionalSafeString(),
  rfq_bid_id: z.string().uuid().optional(),
  lines: z.array(poLineSchema).min(1),
});

// ============================================================
// grLineSchema
// ============================================================

export const grLineSchema = z.object({
  po_line_id: z.string().uuid(),
  item_id: z.string().uuid(),
  qty_received: z.number().gt(0),
  unit_price: z.number().min(0),
  spot_id: z.string().uuid().optional(),
  serial_number: optionalSafeString(),
  lot_number: optionalSafeString(),
  condition_notes: optionalSafeString(),
});

// ============================================================
// createGoodsReceiptSchema
// ============================================================

export const createGoodsReceiptSchema = z.object({
  po_id: z.string().uuid(),
  division_id: z.string().uuid(),
  location_id: z.string().uuid(),
  received_date: z.string().optional(),
  notes: optionalSafeString(),
  lines: z.array(grLineSchema).min(1),
});

// ============================================================
// Inferred types
// ============================================================

export type POLine = z.infer<typeof poLineSchema>;
export type CreatePurchaseOrder = z.infer<typeof createPurchaseOrderSchema>;
export type GRLine = z.infer<typeof grLineSchema>;
export type CreateGoodsReceipt = z.infer<typeof createGoodsReceiptSchema>;
