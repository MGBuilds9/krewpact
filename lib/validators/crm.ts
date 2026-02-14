import { z } from 'zod';

// --- Lead stages (from DB enum lead_stage) ---
const leadStages = [
  'new',
  'qualified',
  'estimating',
  'proposal_sent',
  'won',
  'lost',
] as const;

// --- Opportunity stages (from DB enum opportunity_stage) ---
const opportunityStages = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_lost',
] as const;

// --- Activity types ---
const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

// ============================================================
// Account schemas
// ============================================================

export const accountCreateSchema = z.object({
  account_name: z.string().min(1).max(200),
  account_type: z.string(),
  division_id: z.string().uuid().optional(),
  billing_address: z.record(z.string(), z.any()).optional(),
  shipping_address: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
});

export const accountUpdateSchema = z.object({
  account_name: z.string().min(1).max(200).optional(),
  account_type: z.string().optional(),
  division_id: z.string().uuid().optional(),
  billing_address: z.record(z.string(), z.any()).optional().nullable(),
  shipping_address: z.record(z.string(), z.any()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ============================================================
// Contact schemas
// ============================================================

export const contactCreateSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  account_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role_title: z.string().optional(),
  is_primary: z.boolean().optional(),
});

export const contactUpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  account_id: z.string().uuid().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role_title: z.string().optional().nullable(),
  is_primary: z.boolean().optional(),
});

// ============================================================
// Lead schemas
// ============================================================

export const leadCreateSchema = z.object({
  lead_name: z.string().min(1).max(200),
  division_id: z.string().uuid().optional(),
  source: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  estimated_value: z.number().min(0).optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  assigned_to: z.string().uuid().optional(),
});

export const leadUpdateSchema = z.object({
  lead_name: z.string().min(1).max(200).optional(),
  division_id: z.string().uuid().optional(),
  source: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  estimated_value: z.number().min(0).optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export const leadStageTransitionSchema = z
  .object({
    stage: z.enum(leadStages),
    lost_reason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.stage !== 'lost' ||
      (data.lost_reason !== undefined && data.lost_reason.length > 0),
    { message: 'lost_reason is required when stage is lost' },
  );

// ============================================================
// Opportunity schemas
// ============================================================

export const opportunityCreateSchema = z.object({
  opportunity_name: z.string().min(1).max(200),
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
  opportunity_name: z.string().min(1).max(200).optional(),
  lead_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  division_id: z.string().uuid().optional(),
  stage: z.enum(opportunityStages).optional(),
  target_close_date: z.string().optional().nullable(),
  estimated_revenue: z.number().min(0).optional(),
  probability_pct: z.number().min(0).max(100).optional(),
  owner_user_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ============================================================
// Activity schemas
// ============================================================

export const activityCreateSchema = z
  .object({
    activity_type: z.enum(activityTypes),
    title: z.string().min(1).max(200),
    opportunity_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().optional(),
    details: z.string().optional(),
    due_at: z.string().optional(),
    owner_user_id: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.opportunity_id !== undefined ||
      data.lead_id !== undefined ||
      data.account_id !== undefined ||
      data.contact_id !== undefined,
    {
      message:
        'At least one of opportunity_id, lead_id, account_id, or contact_id must be provided',
    },
  );

export const activityUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  details: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable(),
});

// ============================================================
// Inferred types
// ============================================================

export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;
export type ContactCreate = z.infer<typeof contactCreateSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;
export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type LeadStageTransition = z.infer<typeof leadStageTransitionSchema>;
export type OpportunityCreate = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdate = z.infer<typeof opportunityUpdateSchema>;
export type ActivityCreate = z.infer<typeof activityCreateSchema>;
export type ActivityUpdate = z.infer<typeof activityUpdateSchema>;
