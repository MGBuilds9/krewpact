import { NextResponse } from 'next/server';

import { dbError,forbidden, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/portal/projects/[id]
 * Returns a single project detail for a portal user.
 * Guard: portal_permissions row must exist for the calling portal_account.
 */
export const GET = withApiRoute({}, async ({ userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // 1. Resolve portal account
  const { data: portalAccount, error: paError } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (paError || !portalAccount) {
    throw forbidden('Portal account not found');
  }

  if (portalAccount.status !== 'active') {
    throw forbidden('Portal account inactive');
  }

  // 2. Verify permission for this specific project
  const { data: permission, error: permError } = await supabase
    .from('portal_permissions')
    .select('permission_set')
    .eq('portal_account_id', portalAccount.id)
    .eq('project_id', projectId)
    .single();

  if (permError || !permission) {
    throw forbidden('Access denied to this project');
  }

  // 3. Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      'id, project_name, project_number, status, start_date, target_completion_date, actual_completion_date, site_address, baseline_budget, current_budget, account_id',
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw notFound('Project');
  }

  const permSet: Record<string, boolean> =
    (permission.permission_set as Record<string, boolean>) ?? {};

  // Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: portalAccount.id,
    viewed_resource_type: 'project',
    viewed_resource_id: projectId,
  });

  return NextResponse.json({
    ...project,
    // Only expose financials if the permission_set explicitly grants it
    baseline_budget: permSet.view_financials ? project.baseline_budget : undefined,
    current_budget: permSet.view_financials ? project.current_budget : undefined,
    permission_set: permSet,
  });
});
