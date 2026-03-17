import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

export const contactCreateSchema = z.object({
  first_name: safeString().pipe(z.string().min(1).max(100)),
  last_name: safeString().pipe(z.string().min(1).max(100)),
  account_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role_title: optionalSafeString(),
  is_primary: z.boolean().optional(),
});

export const contactUpdateSchema = z.object({
  first_name: safeString().pipe(z.string().min(1).max(100)).optional(),
  last_name: safeString().pipe(z.string().min(1).max(100)).optional(),
  account_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role_title: nullableSafeString(),
  is_primary: z.boolean().optional(),
});

export type ContactCreate = z.infer<typeof contactCreateSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;
