import { z } from 'zod';

import { nullableSafeString, optionalSafeString, safeString } from '@/lib/sanitize';

export const biddingSources = ['merx', 'bids_tenders', 'manual', 'referral'] as const;
export const biddingStatuses = [
  'new',
  'reviewing',
  'bidding',
  'submitted',
  'won',
  'lost',
  'expired',
] as const;

export const biddingCreateSchema = z.object({
  title: safeString().pipe(z.string().min(1).max(300)),
  division_id: z.string().uuid().optional(),
  source: z.enum(biddingSources).optional(),
  url: z.string().url().optional(),
  deadline: z.string().optional(),
  estimated_value: z.number().min(0).optional(),
  status: z.enum(biddingStatuses).optional(),
  assigned_to: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  notes: optionalSafeString(),
});

export const biddingUpdateSchema = z.object({
  title: safeString().pipe(z.string().min(1).max(300)).optional(),
  division_id: z.string().uuid().optional().nullable(),
  source: z.enum(biddingSources).optional(),
  url: z.string().url().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimated_value: z.number().min(0).optional().nullable(),
  status: z.enum(biddingStatuses).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  notes: nullableSafeString(),
});

export const biddingImportSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        source: z.enum(biddingSources).optional(),
        url: z.string().url().optional(),
        deadline: z.string().optional(),
        estimated_value: z.number().min(0).optional(),
        notes: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
});
