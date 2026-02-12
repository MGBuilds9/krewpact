import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
});

// GET /api/dashboard — returns at-a-glance counts and recent activity
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id } = parsed.data;

  try {
    const supabase = await createUserClient();

    // Run all count queries in parallel for performance
    const [projectsResult, expensesResult, reportsResult, notificationsResult, recentProjectsResult] =
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

        // Pending expenses count
        supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // Pending reports count
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // Unread notifications count
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('read', false),

        // Recent projects (5)
        (() => {
          let q = supabase
            .from('projects')
            .select('id, name, status, address, start_date, end_date, budget, spent')
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
        pendingReports: reportsResult.count ?? 0,
        unreadNotifications: notificationsResult.count ?? 0,
      },
      recentProjects: recentProjectsResult.data ?? [],
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}
