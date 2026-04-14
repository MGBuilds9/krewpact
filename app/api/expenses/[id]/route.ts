import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  expense_date: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'posted']).optional(),
  tax_amount: z.number().nonnegative().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('expense_claims')
    .select(
      'id, user_id, project_id, division_id, amount, tax_amount, currency_code, category, description, expense_date, status, submitted_at, posted_at, erp_document_id, erp_document_type, created_at, updated_at, user:users(first_name, last_name, avatar_url), project:projects(project_name)',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Expense claim');
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
      .from('expense_claims')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Expense claim');
      throw dbError(error.message);
    }

    queue
      .enqueue(JobType.ERPSyncExpense, {
        entityId: data.id,
        userId,
        meta: { operation: 'update' },
      })
      .catch((err) => {
        logger.error('Failed to enqueue ERPNext expense update sync', {
          expenseId: data.id,
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

  const { error } = await supabase.from('expense_claims').delete().eq('id', id);
  if (error) throw dbError(error.message);

  queue
    .enqueue(JobType.ERPSyncExpense, {
      entityId: id,
      userId,
      meta: { operation: 'delete' },
    })
    .catch((err) => {
      logger.error('Failed to enqueue ERPNext expense delete sync', {
        expenseId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return NextResponse.json({ success: true });
});
