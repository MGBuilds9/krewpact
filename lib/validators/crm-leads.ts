import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

// --- Lead statuses (from DB enum lead_status) ---
export const leadStages = [
  'new',
  'qualified',
  'contacted',
  'proposal',
  'negotiation',
  'nurture',
  'won',
  'lost',
] as const;

export const leadCreateSchema = z.object({
  company_name: safeString().pipe(z.string().min(1).max(200)),
  division_id: z.string().min(1).optional(),
  source_channel: z.string().optional(),
  industry: optionalSafeString(),
  city: optionalSafeString(),
  province: optionalSafeString(),
  assigned_to: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
});

export const leadUpdateSchema = z.object({
  company_name: safeString().pipe(z.string().min(1).max(200)).optional(),
  division_id: z.string().min(1).optional(),
  source_channel: nullableSafeString(),
  industry: nullableSafeString(),
  city: nullableSafeString(),
  province: nullableSafeString(),
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.string().optional(),
});

export const leadStageTransitionSchema = z
  .object({
    status: z.enum(leadStages),
    lost_reason: z.string().optional(),
  })
  .refine(
    (data) =>
      data.status !== 'lost' || (data.lost_reason !== undefined && data.lost_reason.length > 0),
    { message: 'lost_reason is required when status is lost' },
  );

export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type LeadStageTransition = z.infer<typeof leadStageTransitionSchema>;
