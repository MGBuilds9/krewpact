import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/portal/projects/[id]/invoices
 * Returns invoice / job-cost snapshot data for a project.
 * Guard: permission_set.view_financials must be true.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await params;
  const supabase = await createUserClient();

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

  // 3. Fetch job cost snapshots (invoice-level summaries)
  const { data: snapshots, error } = await supabase
    .from('job_cost_snapshots')
    .select(
      'id, snapshot_date, period_label, labour_cost, material_cost, subcontract_cost, overhead_cost, total_cost, budget_total, variance, margin_pct, created_at',
    )
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(24); // Last 24 months of snapshots

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: pa.id,
    viewed_resource_type: 'invoices',
    viewed_resource_id: null,
  });

  return NextResponse.json({ snapshots: snapshots ?? [] });
}
