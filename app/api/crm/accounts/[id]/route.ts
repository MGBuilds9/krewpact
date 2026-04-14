import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { accountUpdateSchema } from '@/lib/validators/crm';

const ACCOUNT_SELECT =
  'id, account_name, account_type, division_id, billing_address, shipping_address, notes, industry, phone, email, website, address, company_code, source, total_projects, lifetime_revenue, first_project_date, last_project_date, is_repeat_client, tags, metadata, deleted_at, created_by, created_at, updated_at';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('accounts')
    .select(ACCOUNT_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error.code === 'PGRST116' ? notFound('Account') : dbError(error.message);

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: accountUpdateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('accounts')
      .update(body as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error.code === 'PGRST116' ? notFound('Account') : dbError(error.message);

    queue
      .enqueue(JobType.ERPSyncAccount, {
        entityId: data.id,
        userId,
        meta: { operation: 'update' },
      })
      .catch((err) => {
        logger.error('Failed to enqueue ERPNext account update sync', {
          accountId: data.id,
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

  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw dbError(error.message);

  queue
    .enqueue(JobType.ERPSyncAccount, {
      entityId: id,
      userId,
      meta: { operation: 'delete' },
    })
    .catch((err) => {
      logger.error('Failed to enqueue ERPNext account delete sync', {
        accountId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return NextResponse.json({ success: true });
});
