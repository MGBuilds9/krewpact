import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

async function resolvePortalPermission(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  userId: string,
  projectId: string,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.status !== 'active') return null;

  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('permission_set')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  if (!perm) return null;

  return {
    portalAccountId: pa.id,
    permSet: (perm.permission_set as Record<string, boolean>) ?? {},
  };
}

/**
 * GET /api/portal/projects/[id]/change-orders
 * Returns change orders for a project visible to the portal user.
 * Statuses visible: pending_client_approval, approved, rejected
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id: projectId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalPermission(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Fetch change orders visible to portal users
  const {
    data: changeOrders,
    error,
    count,
  } = await supabase
    .from('change_orders')
    .select(
      'id, co_number, title, description, status, total_amount, submitted_at, approved_at, rejected_at',
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .in('status', ['pending_client_approval', 'approved', 'rejected'])
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'change_orders',
    viewed_resource_id: null,
  });

  return NextResponse.json({
    ...paginatedResponse(changeOrders, count, limit, offset),
    can_approve: access.permSet.approve_change_orders === true,
  });
}
