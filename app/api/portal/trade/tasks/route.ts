import { NextResponse } from 'next/server';

import { dbError,forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

async function resolveActiveTradePartner(
  userId: string,
  supabase: Awaited<ReturnType<typeof createUserClient>>,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();
  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

/**
 * GET /api/portal/trade/tasks
 * Returns tasks assigned to this trade partner's account, scoped by portal_permissions.
 */
export const GET = withApiRoute({}, async ({ req, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  const projectId = req.nextUrl.searchParams.get('project_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Fetch tasks where metadata.trade_portal_id matches this portal account
  let query = supabase
    .from('tasks')
    .select(
      'id, project_id, title, description, status, priority, due_at, blocked_reason, metadata, created_at, updated_at',
      { count: 'exact' },
    )
    .contains('metadata', { trade_portal_id: pa.id })
    .order('due_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
