import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
});

// GET /api/dashboard — returns at-a-glance counts and recent activity
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id } = parsed.data;

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Run all count queries in parallel for performance
  const [projectsResult, expensesResult, leadsResult, notificationsResult, recentProjectsResult] =
    await Promise.all([
      // Active projects count
      (() => {
        let q = supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        if (division_id) q = q.eq('division_id', division_id);
        return q;
      })(),

      // Pending expense claims count
      supabase
        .from('expense_claims')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),

      // Open leads count
      (() => {
        let q = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '(won,lost)');
        if (division_id) q = q.eq('division_id', division_id);
        return q;
      })(),

      // Unread notifications count (state != 'read')
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .neq('state', 'read'),

      // Recent projects (5)
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
}
