import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  project_name: z.string().min(1).max(200).optional(),
  project_number: z.string().min(1).max(50).optional(),
  status: z
    .enum(['planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled'])
    .optional(),
  site_address: z.record(z.string(), z.any()).nullable().optional(),
  baseline_budget: z.number().nonnegative().nullable().optional(),
  current_budget: z.number().nonnegative().nullable().optional(),
  start_date: z.string().nullable().optional(),
  target_completion_date: z.string().nullable().optional(),
  actual_completion_date: z.string().nullable().optional(),
  division_id: z.string().min(1).nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  contract_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id, project_name, project_number, status, division_id, account_id, contact_id, contract_id, baseline_budget, current_budget, start_date, target_completion_date, actual_completion_date, site_address, baseline_schedule, metadata, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Project');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: updateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Project');
      throw dbError(error.message);
    }

    queue
      .enqueue(JobType.ERPSyncProject, {
        entityId: data.id,
        userId,
        meta: { operation: 'update' },
      })
      .catch((err) => {
        logger.error('Failed to enqueue ERPNext project update sync', {
          projectId: data.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params, userId }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) throw dbError(error.message);

  queue
    .enqueue(JobType.ERPSyncProject, {
      entityId: id,
      userId,
      meta: { operation: 'delete' },
    })
    .catch((err) => {
      logger.error('Failed to enqueue ERPNext project delete sync', {
        projectId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return NextResponse.json({ success: true });
});
