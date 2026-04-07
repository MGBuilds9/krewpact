import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

async function resolvePortalAccess(
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
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  if (!perm) return null;

  return { portalAccountId: pa.id };
}

/**
 * GET /api/portal/projects/[id]/progress
 * Returns milestones and tasks for progress tracking.
 * Guard: active portal account with permission for this project.
 */
export const GET = withApiRoute({}, async ({ userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  const [milestonesResult, tasksResult] = await Promise.all([
    supabase
      .from('milestones')
      .select('id, name, due_date, completed_at, status, sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, title, status, milestone_id, due_date, completed_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
  ]);

  if (milestonesResult.error) throw dbError(milestonesResult.error.message);
  if (tasksResult.error) throw dbError(tasksResult.error.message);

  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'progress',
    viewed_resource_id: null,
  });

  const milestones = milestonesResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'completed').length;

  return NextResponse.json({
    milestones,
    tasks,
    summary: {
      total_milestones: total,
      completed_milestones: completed,
      completion_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  });
});
