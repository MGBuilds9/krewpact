import { z } from 'zod';

// ============================================================
// Reference data
// ============================================================

const SOURCE_TYPES = ['vault_import', 'upload', 'url_scrape'] as const;
const STAGING_STATUSES = [
  'pending_review',
  'approved',
  'rejected',
  'needs_edit',
  'ingested',
] as const;
const CATEGORIES = [
  'sop',
  'strategy',
  'market',
  'infrastructure',
  'marketing',
  'architecture',
  'analysis',
  'reference',
] as const;
const SUB_CATEGORIES = [
  'platform',
  'dev_tools',
  'marketing',
  'operations',
  'communications',
  'infrastructure',
] as const;
const BILLING_CYCLES = ['monthly', 'annual'] as const;

// ============================================================
// Knowledge Staging schemas
// ============================================================

export const stagingCreateSchema = z.object({
  title: z.string().min(1).max(500),
  raw_content: z.string().min(1),
  source_type: z.enum(SOURCE_TYPES),
  source_path: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  division_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const stagingUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  edited_content: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  division_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(STAGING_STATUSES).optional(),
  review_notes: z.string().optional(),
});

export const stagingBulkImportSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        category: z.enum(CATEGORIES).optional(),
        division_id: z.string().uuid().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(100),
});

// ============================================================
// Subscription schemas
// ============================================================

export const subscriptionCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(SUB_CATEGORIES),
  vendor: z.string().max(200).optional(),
  monthly_cost: z.number().min(0).optional(),
  currency: z.string().length(3).default('CAD'),
  billing_cycle: z.enum(BILLING_CYCLES).default('monthly'),
  renewal_date: z.string().optional(),
  division_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type StagingCreate = z.infer<typeof stagingCreateSchema>;
export type StagingUpdate = z.infer<typeof stagingUpdateSchema>;
export type StagingBulkImport = z.infer<typeof stagingBulkImportSchema>;
export type SubscriptionCreate = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdate = z.infer<typeof subscriptionUpdateSchema>;
