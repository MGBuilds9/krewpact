import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/portal/projects/[id]/invoices
 * Returns invoice / job-cost snapshot data for a project.
 * Guard: permission_set.view_financials must be true.
 */
export const GET = withApiRoute({}, async ({ req, userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // 1. Resolve portal account
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.status !== 'active') {
    throw forbidden('Access denied');
  }

  // 2. Check view_financials permission
  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('permission_set')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  const permSet: Record<string, boolean> = (perm?.permission_set as Record<string, boolean>) ?? {};
  if (!permSet.view_financials) {
    throw forbidden('Financial access not granted for this project');
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // 3. Fetch job cost snapshots (invoice-level summaries)
  const {
    data: snapshots,
    error,
    count,
  } = await supabase
    .from('job_cost_snapshots')
    .select(
      'id, snapshot_date, period_label, labour_cost, material_cost, subcontract_cost, overhead_cost, total_cost, budget_total, variance, margin_pct, created_at',
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  // 4. Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: pa.id,
    viewed_resource_type: 'invoices',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(snapshots, count, limit, offset));
});
