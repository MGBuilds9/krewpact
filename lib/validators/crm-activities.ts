import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

// --- Activity types ---
export const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

export const activityCreateSchema = z
  .object({
    activity_type: z.enum(activityTypes),
    title: safeString().pipe(z.string().min(1).max(200)),
    opportunity_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional(),
    account_id: z.string().uuid().optional(),
    contact_id: z.string().uuid().optional(),
    details: optionalSafeString(),
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
  title: safeString().pipe(z.string().min(1).max(200)).optional(),
  details: nullableSafeString(),
  due_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  owner_user_id: z.string().uuid().optional().nullable(),
});

export type ActivityCreate = z.infer<typeof activityCreateSchema>;
export type ActivityUpdate = z.infer<typeof activityUpdateSchema>;
