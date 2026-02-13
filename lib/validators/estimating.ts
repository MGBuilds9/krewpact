import { z } from 'zod';

// ============================================================
// Estimate schemas
// ============================================================

export const estimateCreateSchema = z.object({
  division_id: z.string().uuid(),
  opportunity_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  currency_code: z.string().default('CAD'),
});

export const estimateUpdateSchema = z.object({
  division_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  currency_code: z.string().optional(),
});

// ============================================================
// Estimate line schemas
// ============================================================

export const estimateLineCreateSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().gt(0),
  unit_cost: z.number().min(0),
  parent_line_id: z.string().uuid().optional(),
  line_type: z.string().default('item'),
  unit: z.string().optional(),
  markup_pct: z.number().min(0).max(100).default(0),
  is_optional: z.boolean().default(false),
  sort_order: z.number().int().optional(),
});

export const estimateLineUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().gt(0).optional(),
  unit_cost: z.number().min(0).optional(),
  parent_line_id: z.string().uuid().optional().nullable(),
  line_type: z.string().optional(),
  unit: z.string().optional().nullable(),
  markup_pct: z.number().min(0).max(100).optional(),
  is_optional: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const estimateLineBatchUpdateSchema = z.array(
  estimateLineUpdateSchema.extend({
    id: z.string().uuid(),
  }),
);

// ============================================================
// Inferred types
// ============================================================

export type EstimateCreate = z.infer<typeof estimateCreateSchema>;
export type EstimateUpdate = z.infer<typeof estimateUpdateSchema>;
export type EstimateLineCreate = z.infer<typeof estimateLineCreateSchema>;
export type EstimateLineUpdate = z.infer<typeof estimateLineUpdateSchema>;
export type EstimateLineBatchUpdate = z.infer<typeof estimateLineBatchUpdateSchema>;
