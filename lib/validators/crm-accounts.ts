import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

export const accountCreateSchema = z.object({
  account_name: safeString().pipe(z.string().min(1).max(200)),
  account_type: z.string(),
  division_id: z.string().uuid().optional(),
  billing_address: z.record(z.string(), z.any()).optional(),
  shipping_address: z.record(z.string(), z.any()).optional(),
  notes: optionalSafeString(),
  industry: optionalSafeString(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.record(z.string(), z.any()).optional(),
  company_code: z.string().max(10).optional(),
  source: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
});

export const accountUpdateSchema = z.object({
  account_name: safeString().pipe(z.string().min(1).max(200)).optional(),
  account_type: z.string().optional(),
  division_id: z.string().uuid().optional(),
  billing_address: z.record(z.string(), z.any()).optional().nullable(),
  shipping_address: z.record(z.string(), z.any()).optional().nullable(),
  notes: nullableSafeString(),
  industry: nullableSafeString(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.record(z.string(), z.any()).optional().nullable(),
  company_code: z.string().max(10).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  total_projects: z.number().int().min(0).optional(),
  lifetime_revenue: z.number().min(0).optional(),
  first_project_date: z.string().optional().nullable(),
  last_project_date: z.string().optional().nullable(),
  is_repeat_client: z.boolean().optional(),
});

export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;
