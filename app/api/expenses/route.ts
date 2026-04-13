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
  project_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'posted']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid().optional(),
  division_id: z.string().min(1).optional(),
  expense_date: z.string(),
  user_id: z.string().uuid(),
  tax_amount: z.number().nonnegative().optional(),
  currency_code: z.string().max(3).default('CAD'),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { project_id, status } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('expense_claims')
    .select(
      'id, user_id, project_id, division_id, amount, tax_amount, currency_code, category, description, expense_date, status, submitted_at, posted_at, erp_document_id, erp_document_type, created_at, updated_at, user:users(first_name, last_name, avatar_url), project:projects(project_name)',
      { count: 'exact' },
    )
    .order('expense_date', { ascending: false });

  if (project_id) query = query.eq('project_id', project_id);
  if (status) query = query.eq('status', status);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('expense_claims')
    .insert({ ...body, status: 'draft' })
    .select()
    .single();

  if (error) throw dbError(error.message);

  queue.enqueue(JobType.ERPSyncExpense, { entityId: data.id, userId }).catch((err) => {
    logger.error('Failed to enqueue ERPNext expense sync', {
      expenseId: data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json(data, { status: 201 });
});
