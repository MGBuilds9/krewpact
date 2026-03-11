import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

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
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}
