import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const ALLOWED_ROLES = ['project_manager', 'operations_manager', 'executive', 'platform_admin'];

export interface PMProjectHealth {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  milestoneTotal: number;
  milestoneCompleted: number;
  overdueTaskCount: number;
  lastDailyLogDate: string | null;
  healthScore: number;
  healthStatus: 'green' | 'yellow' | 'red';
}

export interface PMDashboardResponse {
  projects: PMProjectHealth[];
  upcomingMilestones: {
    id: string;
    milestone_name: string;
    planned_date: string;
    status: string;
    project_name: string;
    project_id: string;
  }[];
  overdueTasks: {
    id: string;
    title: string;
    due_at: string;
    status: string;
    priority: string;
    project_name: string;
    project_id: string;
  }[];
}

/**
 * Calculate health score for a project.
 *
 * Factors:
 * - Milestone completion % (0-100, weighted 50%)
 * - Overdue task penalty: -5 points per overdue task (weighted 30%)
 * - Daily log recency: full marks if logged today, degrades over 7 days (weighted 20%)
 */
export function calculateHealthScore(
  milestoneTotal: number,
  milestoneCompleted: number,
  overdueTaskCount: number,
  lastDailyLogDate: string | null,
): { score: number; status: 'green' | 'yellow' | 'red' } {
  // Milestone completion component (50% weight)
  const milestoneScore = milestoneTotal > 0 ? (milestoneCompleted / milestoneTotal) * 100 : 100;

  // Overdue task penalty component (30% weight)
  // Each overdue task reduces this component by 20 points (from 100)
  const overdueScore = Math.max(0, 100 - overdueTaskCount * 20);

  // Daily log recency component (20% weight)
  // Full marks if logged within 1 day, degrades linearly over 7 days
  let logRecencyScore = 0;
  if (lastDailyLogDate) {
    const daysSinceLog = Math.max(
      0,
      (Date.now() - new Date(lastDailyLogDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    logRecencyScore = Math.max(0, 100 - (daysSinceLog / 7) * 100);
  }

  const score = Math.round(milestoneScore * 0.5 + overdueScore * 0.3 + logRecencyScore * 0.2);

  const clampedScore = Math.max(0, Math.min(100, score));

  let status: 'green' | 'yellow' | 'red';
  if (clampedScore > 80) {
    status = 'green';
  } else if (clampedScore >= 50) {
    status = 'yellow';
  } else {
    status = 'red';
  }

  return { score: clampedScore, status };
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role gating
  const roles = (sessionClaims as Record<string, unknown>)?.krewpact_roles;
  const userRoles = Array.isArray(roles) ? roles : [];
  const hasAccess = userRoles.some((r: unknown) => ALLOWED_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: project_manager, operations_manager, or executive role required' },
      { status: 403 },
    );
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Get the user's krewpact_user_id from session claims
  const krewpactUserId = (sessionClaims as Record<string, unknown>)?.krewpact_user_id as
    | string
    | undefined;

  // Get projects where user is assigned as project manager (via project_members with role='manager')
  // or where user created the project
  const { data: memberships, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', krewpactUserId ?? userId)
    .eq('role', 'manager')
    .is('left_at', null);

  if (memberError) {
    return NextResponse.json({ error: 'Failed to fetch project assignments' }, { status: 500 });
  }

  const projectIds = (memberships ?? []).map((m: { project_id: string }) => m.project_id);

  if (projectIds.length === 0) {
    return NextResponse.json({
      projects: [],
      upcomingMilestones: [],
      overdueTasks: [],
    } satisfies PMDashboardResponse);
  }

  // Parallel queries for project data
  const [projectsResult, milestonesResult, tasksResult, logsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, project_name, project_number, status, start_date, target_completion_date')
      .in('id', projectIds),
    supabase
      .from('milestones')
      .select('id, project_id, milestone_name, planned_date, status')
      .in('project_id', projectIds),
    supabase
      .from('tasks')
      .select('id, project_id, title, status, priority, due_at')
      .in('project_id', projectIds),
    supabase
      .from('project_daily_logs')
      .select('project_id, log_date')
      .in('project_id', projectIds)
      .order('log_date', { ascending: false }),
  ]);

  if (projectsResult.error || milestonesResult.error || tasksResult.error || logsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch PM dashboard data' }, { status: 500 });
  }

  const projects = projectsResult.data ?? [];
  const allMilestones = milestonesResult.data ?? [];
  const allTasks = tasksResult.data ?? [];
  const allLogs = logsResult.data ?? [];

  const now = new Date();
  const nowISO = now.toISOString();

  // Build per-project health data
  const projectHealthCards: PMProjectHealth[] = projects.map((project) => {
    const projectMilestones = allMilestones.filter((m) => m.project_id === project.id);
    const milestoneTotal = projectMilestones.length;
    const milestoneCompleted = projectMilestones.filter((m) => m.status === 'completed').length;

    const projectTasks = allTasks.filter((t) => t.project_id === project.id);
    const overdueTaskCount = projectTasks.filter(
      (t) => t.due_at && t.due_at < nowISO && t.status !== 'done' && t.status !== 'completed',
    ).length;

    const projectLogs = allLogs.filter((l) => l.project_id === project.id);
    const lastDailyLogDate = projectLogs.length > 0 ? projectLogs[0].log_date : null;

    const { score, status } = calculateHealthScore(
      milestoneTotal,
      milestoneCompleted,
      overdueTaskCount,
      lastDailyLogDate,
    );

    return {
      id: project.id,
      project_name: project.project_name,
      project_number: project.project_number,
      status: project.status,
      start_date: project.start_date,
      target_completion_date: project.target_completion_date,
      milestoneTotal,
      milestoneCompleted,
      overdueTaskCount,
      lastDailyLogDate,
      healthScore: score,
      healthStatus: status,
    };
  });

  // Upcoming milestones (next 7 days)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const projectMap = new Map(projects.map((p) => [p.id, p.project_name]));

  const upcomingMilestones = allMilestones
    .filter(
      (m) =>
        m.planned_date &&
        m.planned_date >= nowISO.slice(0, 10) &&
        m.planned_date <= sevenDaysFromNow.slice(0, 10) &&
        m.status !== 'completed',
    )
    .map((m) => ({
      id: m.id,
      milestone_name: m.milestone_name,
      planned_date: m.planned_date,
      status: m.status,
      project_name: projectMap.get(m.project_id) ?? '',
      project_id: m.project_id,
    }))
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date));

  // Overdue tasks (across all projects)
  const overdueTasks = allTasks
    .filter((t) => t.due_at && t.due_at < nowISO && t.status !== 'done' && t.status !== 'completed')
    .map((t) => ({
      id: t.id,
      title: t.title,
      due_at: t.due_at,
      status: t.status,
      priority: t.priority,
      project_name: projectMap.get(t.project_id) ?? '',
      project_id: t.project_id,
    }))
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  return NextResponse.json({
    projects: projectHealthCards,
    upcomingMilestones,
    overdueTasks,
  } satisfies PMDashboardResponse);
}
