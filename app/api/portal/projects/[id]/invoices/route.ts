import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * GET /api/portal/projects/[id]/invoices
 * Returns invoice / job-cost snapshot data for a project.
 * Guard: permission_set.view_financials must be true.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id: projectId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // 1. Resolve portal account
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.status !== 'active') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
    return NextResponse.json(
      { error: 'Financial access not granted for this project' },
      { status: 403 },
    );
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: pa.id,
    viewed_resource_type: 'invoices',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(snapshots, count, limit, offset));
}
