import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

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
export const GET = withApiRoute({}, async ({ req, userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalPermission(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

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

  if (error) throw dbError(error.message);

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
});
