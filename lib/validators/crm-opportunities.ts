import { z } from 'zod';

import { nullableSafeString, safeString } from '@/lib/sanitize';

// --- Opportunity stages (from DB enum opportunity_stage) ---
// `contracted` = contract signed, work may still be active.
// `closed_won` = terminal won state — reporting/executive metrics pivot on this.
// Historical note: pre-2026-04-07, CRM used `contracted` as the terminal won
// stage and reporting used `closed_won`. The two were unified via migration
// `20260407_001_add_closed_won_stage.sql` (enum add) +
// `20260407_002_migrate_contracted_won_to_closed_won.sql` (backfill).
export const opportunityStages = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_won',
  'closed_lost',
] as const;

export const opportunityCreateSchema = z.object({
  opportunity_name: safeString().pipe(z.string().min(1).max(200)),
  lead_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  division_id: z.string().uuid().optional(),
  stage: z.enum(opportunityStages).optional(),
  target_close_date: z.string().optional(),
  estimated_revenue: z.number().min(0).optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  owner_user_id: z.string().uuid().optional(),
});

export const opportunityUpdateSchema = z.object({
  opportunity_name: safeString().pipe(z.string().min(1).max(200)).optional(),
  lead_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  division_id: z.string().uuid().optional(),
  stage: z.enum(opportunityStages).optional(),
  target_close_date: z.string().optional().nullable(),
  estimated_revenue: z.number().min(0).optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  owner_user_id: z.string().uuid().optional().nullable(),
  notes: nullableSafeString(),
});

export const opportunityStageTransitionSchema = z
  .object({
    stage: z.enum(opportunityStages),
    lost_reason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.stage !== 'closed_lost' ||
      (data.lost_reason !== undefined && data.lost_reason.length > 0),
    { message: 'lost_reason is required when stage is closed_lost' },
  );

export const wonDealSchema = z.object({
  won_date: z.string().optional(),
  won_notes: z.string().optional(),
  sync_to_erp: z.boolean().optional(),
});
export type WonDeal = z.infer<typeof wonDealSchema>;

export const lostDealSchema = z.object({
  lost_reason: z.string().min(1),
  lost_notes: z.string().optional(),
  competitor: z.string().optional(),
  reopen_as_lead: z.boolean().optional(),
});
export type LostDeal = z.infer<typeof lostDealSchema>;

export const linkedEstimateCreateSchema = z.object({
  estimate_number: z.string().min(1).max(50),
  total_amount: z.number().min(0),
  status: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type LinkedEstimateCreate = z.infer<typeof linkedEstimateCreateSchema>;

export type OpportunityCreate = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdate = z.infer<typeof opportunityUpdateSchema>;
export type OpportunityStageTransition = z.infer<typeof opportunityStageTransitionSchema>;
