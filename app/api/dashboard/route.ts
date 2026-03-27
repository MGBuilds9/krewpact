import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { division_id } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [projectsResult, expensesResult, leadsResult, notificationsResult, recentProjectsResult] =
    await Promise.all([
      (() => {
        let q = supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        if (division_id) q = q.eq('division_id', division_id);
        return q;
      })(),
      supabase
        .from('expense_claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      (() => {
        let q = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '(won,lost)');
        if (division_id) q = q.eq('division_id', division_id);
        return q;
      })(),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .neq('state', 'read'),
      (() => {
        let q = supabase
          .from('projects')
          .select(
            'id, project_name, project_number, status, site_address, start_date, target_completion_date, baseline_budget, current_budget',
          )
          .order('created_at', { ascending: false })
          .limit(5);
        if (division_id) q = q.eq('division_id', division_id);
        return q;
      })(),
    ]);

  return NextResponse.json({
    atAGlance: {
      activeProjects: projectsResult.count ?? 0,
      pendingExpenses: expensesResult.count ?? 0,
      openLeads: leadsResult.count ?? 0,
      unreadNotifications: notificationsResult.count ?? 0,
    },
    recentProjects: recentProjectsResult.data ?? [],
  });
});
