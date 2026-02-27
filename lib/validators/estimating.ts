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
// Cost catalog schemas
// ============================================================

const catalogItemTypes = ['material', 'labor', 'equipment', 'subcontract', 'other'] as const;

export const costCatalogItemCreateSchema = z.object({
  division_id: z.string().uuid().optional(),
  item_code: z.string().max(50).optional(),
  item_name: z.string().min(1).max(200),
  item_type: z.enum(catalogItemTypes),
  unit: z.string().min(1).max(20),
  base_cost: z.number().min(0),
  vendor_name: z.string().max(200).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const costCatalogItemUpdateSchema = z.object({
  division_id: z.string().uuid().optional().nullable(),
  item_code: z.string().max(50).optional().nullable(),
  item_name: z.string().min(1).max(200).optional(),
  item_type: z.enum(catalogItemTypes).optional(),
  unit: z.string().min(1).max(20).optional(),
  base_cost: z.number().min(0).optional(),
  vendor_name: z.string().max(200).optional().nullable(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Assembly schemas
// ============================================================

export const assemblyCreateSchema = z.object({
  division_id: z.string().uuid().optional(),
  assembly_code: z.string().max(50).optional(),
  assembly_name: z.string().min(1).max(200),
  description: z.string().optional(),
  unit: z.string().min(1).max(20),
  is_active: z.boolean().optional(),
});

export const assemblyUpdateSchema = z.object({
  division_id: z.string().uuid().optional().nullable(),
  assembly_code: z.string().max(50).optional().nullable(),
  assembly_name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  unit: z.string().min(1).max(20).optional(),
  is_active: z.boolean().optional(),
});

export const assemblyItemCreateSchema = z.object({
  catalog_item_id: z.string().uuid().optional(),
  line_type: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().gt(0),
  unit_cost: z.number().min(0),
  sort_order: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const assemblyItemUpdateSchema = z.object({
  catalog_item_id: z.string().uuid().optional().nullable(),
  line_type: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().gt(0).optional(),
  unit_cost: z.number().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Estimate template schemas
// ============================================================

export const estimateTemplateCreateSchema = z.object({
  division_id: z.string().uuid().optional(),
  template_name: z.string().min(1).max(200),
  project_type: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  is_default: z.boolean().optional(),
});

export const estimateTemplateUpdateSchema = z.object({
  division_id: z.string().uuid().optional().nullable(),
  template_name: z.string().min(1).max(200).optional(),
  project_type: z.string().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
  is_default: z.boolean().optional(),
});

// ============================================================
// Estimate alternate schemas
// ============================================================

export const estimateAlternateCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  amount: z.number(),
  selected: z.boolean().optional(),
});

export const estimateAlternateUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  amount: z.number().optional(),
  selected: z.boolean().optional(),
});

// ============================================================
// Estimate allowance schemas
// ============================================================

export const estimateAllowanceCreateSchema = z.object({
  allowance_name: z.string().min(1).max(200),
  allowance_amount: z.number().min(0),
  notes: z.string().optional(),
});

export const estimateAllowanceUpdateSchema = z.object({
  allowance_name: z.string().min(1).max(200).optional(),
  allowance_amount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

// ============================================================
// Inferred types
// ============================================================

export type EstimateCreate = z.infer<typeof estimateCreateSchema>;
export type EstimateUpdate = z.infer<typeof estimateUpdateSchema>;
export type EstimateLineCreate = z.infer<typeof estimateLineCreateSchema>;
export type EstimateLineUpdate = z.infer<typeof estimateLineUpdateSchema>;
export type EstimateLineBatchUpdate = z.infer<typeof estimateLineBatchUpdateSchema>;
export type CostCatalogItemCreate = z.infer<typeof costCatalogItemCreateSchema>;
export type CostCatalogItemUpdate = z.infer<typeof costCatalogItemUpdateSchema>;
export type AssemblyCreate = z.infer<typeof assemblyCreateSchema>;
export type AssemblyUpdate = z.infer<typeof assemblyUpdateSchema>;
export type AssemblyItemCreate = z.infer<typeof assemblyItemCreateSchema>;
export type AssemblyItemUpdate = z.infer<typeof assemblyItemUpdateSchema>;
export type EstimateTemplateCreate = z.infer<typeof estimateTemplateCreateSchema>;
export type EstimateTemplateUpdate = z.infer<typeof estimateTemplateUpdateSchema>;
export type EstimateAlternateCreate = z.infer<typeof estimateAlternateCreateSchema>;
export type EstimateAlternateUpdate = z.infer<typeof estimateAlternateUpdateSchema>;
export type EstimateAllowanceCreate = z.infer<typeof estimateAllowanceCreateSchema>;
export type EstimateAllowanceUpdate = z.infer<typeof estimateAllowanceUpdateSchema>;
