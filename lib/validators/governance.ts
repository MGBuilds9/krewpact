import { z } from 'zod';

// ============================================================
// Reference data schemas
// ============================================================

export const referenceDataSetSchema = z.object({
  set_key: z.string().min(1),
  set_name: z.string().min(1),
  status: z.enum(['draft', 'active', 'deprecated', 'archived']).optional(),
});

export const referenceDataValueSchema = z.object({
  data_set_id: z.string().uuid(),
  value_key: z.string().min(1),
  value_name: z.string().min(1),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type ReferenceDataSet = z.infer<typeof referenceDataSetSchema>;
export type ReferenceDataValue = z.infer<typeof referenceDataValueSchema>;
