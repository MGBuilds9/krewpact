import { z } from 'zod';

// --- Lead stages (from DB enum lead_stage) ---
const leadStages = [
  'new',
  'contacted',
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
  lead_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role_title: z.string().optional(),
  is_primary: z.boolean().optional(),
});

export const contactUpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  account_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role_title: z.string().optional().nullable(),
  is_primary: z.boolean().optional(),
});

// ============================================================
// Lead schemas
// ============================================================

export const leadCreateSchema = z.object({
  company_name: z.string().min(1).max(200),
  division_id: z.string().min(1).optional(),
  source_channel: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  notes: z.string().optional(),
  owner_id: z.string().uuid().optional(),
});

export const leadUpdateSchema = z.object({
  company_name: z.string().min(1).max(200).optional(),
  division_id: z.string().min(1).optional(),
  source_channel: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  status: z.string().optional(),
});

export const leadStageTransitionSchema = z
  .object({
    stage: z.enum(leadStages),
    lost_reason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.stage !== 'lost' || (data.lost_reason !== undefined && data.lost_reason.length > 0),
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
  source_channel: z.string().optional(),
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
    outcome: z
      .enum(['connected', 'no_answer', 'voicemail', 'callback_requested', 'left_message', 'other'])
      .optional(),
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
// Sequence schemas
// ============================================================

const outreachChannels = [
  'email',
  'call',
  'linkedin',
  'video',
  'meeting',
  'text',
  'site_visit',
] as const;

export const sequenceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  trigger_type: z.string().min(1),
  trigger_conditions: z.object({}).passthrough().optional(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional(),
});

export const sequenceUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  trigger_type: z.string().min(1).optional(),
  trigger_conditions: z.object({}).passthrough().optional().nullable(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional().nullable(),
});

const conditionTypes = ['if_score', 'if_email_opened', 'if_replied', 'if_tag', 'if_stage'] as const;

export const sequenceStepCreateSchema = z.object({
  step_number: z.number().int().min(1),
  action_type: z.enum([
    'email',
    'task',
    'wait',
    'condition',
    'call',
    'linkedin',
    'meeting',
    'site_visit',
  ]),
  action_config: z.object({}).passthrough(),
  delay_days: z.number().int().min(0).optional(),
  delay_hours: z.number().int().min(0).optional(),
  condition_type: z.enum(conditionTypes).optional(),
  condition_config: z.object({}).passthrough().optional(),
  true_next_step_id: z.string().uuid().optional(),
  false_next_step_id: z.string().uuid().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
});

export const sequenceStepUpdateSchema = z.object({
  step_number: z.number().int().min(1).optional(),
  action_type: z
    .enum(['email', 'task', 'wait', 'condition', 'call', 'linkedin', 'meeting', 'site_visit'])
    .optional(),
  action_config: z.object({}).passthrough().optional(),
  delay_days: z.number().int().min(0).optional(),
  delay_hours: z.number().int().min(0).optional(),
  condition_type: z.enum(conditionTypes).optional().nullable(),
  condition_config: z.object({}).passthrough().optional().nullable(),
  true_next_step_id: z.string().uuid().optional().nullable(),
  false_next_step_id: z.string().uuid().optional().nullable(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
});

export const sequenceEnrollSchema = z.object({
  lead_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
});

export const outreachCreateSchema = z.object({
  lead_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  channel: z.enum(outreachChannels),
  direction: z.enum(['inbound', 'outbound']),
  activity_type: z.string().optional(),
  outcome: z.string().optional(),
  outcome_detail: z.string().optional(),
  subject: z.string().optional(),
  message_preview: z.string().optional(),
  notes: z.string().optional(),
  sequence_id: z.string().uuid().optional(),
  sequence_step: z.number().int().optional(),
  is_automated: z.boolean().optional(),
});

// ============================================================
// Auto-log schema
// ============================================================

export const autoLogSchema = z.object({
  email_address: z.string().email(),
  subject: z.string().min(1),
  direction: z.enum(['inbound', 'outbound']),
  message_preview: z.string().max(500).optional(),
});
export type AutoLog = z.infer<typeof autoLogSchema>;

// ============================================================
// Won/Lost deal schemas
// ============================================================

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

// ============================================================
// Tag schemas
// ============================================================

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

export const tagCreateSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  division_id: z.string().uuid().optional(),
});
export type TagCreate = z.infer<typeof tagCreateSchema>;

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});
export type TagUpdate = z.infer<typeof tagUpdateSchema>;

export const entityTagSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});
export type EntityTag = z.infer<typeof entityTagSchema>;

// ============================================================
// Note schemas
// ============================================================

export const noteCreateSchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
  is_pinned: z.boolean().optional(),
});
export type NoteCreate = z.infer<typeof noteCreateSchema>;

export const noteUpdateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  is_pinned: z.boolean().optional(),
});
export type NoteUpdate = z.infer<typeof noteUpdateSchema>;

// ============================================================
// Linked estimate schemas
// ============================================================

export const linkedEstimateCreateSchema = z.object({
  estimate_number: z.string().min(1).max(50),
  total_amount: z.number().min(0),
  status: z.string().min(1).optional(),
  description: z.string().optional(),
});
export type LinkedEstimateCreate = z.infer<typeof linkedEstimateCreateSchema>;

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
export type OpportunityStageTransition = z.infer<typeof opportunityStageTransitionSchema>;
export type ActivityCreate = z.infer<typeof activityCreateSchema>;
export type ActivityUpdate = z.infer<typeof activityUpdateSchema>;
export type SequenceCreate = z.infer<typeof sequenceCreateSchema>;
export type SequenceUpdate = z.infer<typeof sequenceUpdateSchema>;
export type SequenceStepCreate = z.infer<typeof sequenceStepCreateSchema>;
export type SequenceStepUpdate = z.infer<typeof sequenceStepUpdateSchema>;
export type SequenceEnroll = z.infer<typeof sequenceEnrollSchema>;
export type OutreachCreate = z.infer<typeof outreachCreateSchema>;
