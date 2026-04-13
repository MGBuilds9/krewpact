import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z
    .enum(['planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled'])
    .optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createSchema = z.object({
  project_name: z.string().min(1).max(200),
  project_number: z.string().min(1).max(50),
  division_id: z.string().min(1),
  status: z
    .enum(['planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled'])
    .optional(),
  site_address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable()
    .optional(),
  baseline_budget: z.number().nonnegative().optional(),
  current_budget: z.number().nonnegative().optional(),
  start_date: z.string().optional(),
  target_completion_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { division_id, status, search } = querySchema.parse(params);

  let query = supabase
    .from('projects')
    .select(
      'id, project_name, project_number, status, division_id, account_id, contact_id, contract_id, baseline_budget, current_budget, start_date, target_completion_date, actual_completion_date, site_address, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (division_id) query = query.eq('division_id', division_id);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('project_name', `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw dbError('Failed to fetch projects');
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...body })
    .select()
    .single();

  if (error) {
    throw dbError('Failed to create project');
  }

  // Sync to ERPNext in background via QStash
  queue.enqueue(JobType.ERPSyncProject, { entityId: data.id, userId }).catch((err) => {
    logger.error('Failed to enqueue ERPNext project sync', {
      projectId: data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json(data, { status: 201 });
});
