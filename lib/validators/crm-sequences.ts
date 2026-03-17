import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

export const outreachChannels = [
  'email',
  'call',
  'linkedin',
  'video',
  'meeting',
  'text',
  'site_visit',
] as const;

const conditionTypes = ['if_score', 'if_email_opened', 'if_replied', 'if_tag', 'if_stage'] as const;

export const sequenceCreateSchema = z.object({
  name: safeString().pipe(z.string().min(1).max(200)),
  description: optionalSafeString(),
  trigger_type: z.string().min(1),
  trigger_conditions: z.object({}).passthrough().optional(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional(),
});

export const sequenceUpdateSchema = z.object({
  name: safeString().pipe(z.string().min(1).max(200)).optional(),
  description: nullableSafeString(),
  trigger_type: z.string().min(1).optional(),
  trigger_conditions: z.object({}).passthrough().optional().nullable(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional().nullable(),
});

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
  subject: optionalSafeString(),
  message_preview: optionalSafeString(),
  notes: optionalSafeString(),
  sequence_id: z.string().uuid().optional(),
  sequence_step: z.number().int().optional(),
  is_automated: z.boolean().optional(),
});

export const autoLogSchema = z.object({
  email_address: z.string().email(),
  subject: z.string().min(1),
  direction: z.enum(['inbound', 'outbound']),
  message_preview: z.string().max(500).optional(),
});
export type AutoLog = z.infer<typeof autoLogSchema>;

export type SequenceCreate = z.infer<typeof sequenceCreateSchema>;
export type SequenceUpdate = z.infer<typeof sequenceUpdateSchema>;
export type SequenceStepCreate = z.infer<typeof sequenceStepCreateSchema>;
export type SequenceStepUpdate = z.infer<typeof sequenceStepUpdateSchema>;
export type SequenceEnroll = z.infer<typeof sequenceEnrollSchema>;
export type OutreachCreate = z.infer<typeof outreachCreateSchema>;
