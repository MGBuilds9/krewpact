import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
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
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const [milestonesResult, tasksResult] = await Promise.all([
    supabase
      .from('project_milestones')
      .select('id, name, due_date, completed_at, status, sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('project_tasks')
      .select('id, title, status, milestone_id, due_date, completed_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
  ]);

  if (milestonesResult.error) {
    return NextResponse.json({ error: milestonesResult.error.message }, { status: 500 });
  }
  if (tasksResult.error) {
    return NextResponse.json({ error: tasksResult.error.message }, { status: 500 });
  }

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
}
