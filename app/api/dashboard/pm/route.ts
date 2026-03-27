import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

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

export function calculateHealthScore(
  milestoneTotal: number,
  milestoneCompleted: number,
  overdueTaskCount: number,
  lastDailyLogDate: string | null,
): { score: number; status: 'green' | 'yellow' | 'red' } {
  const milestoneScore = milestoneTotal > 0 ? (milestoneCompleted / milestoneTotal) * 100 : 100;
  const overdueScore = Math.max(0, 100 - overdueTaskCount * 20);

  let logRecencyScore = 0;
  if (lastDailyLogDate) {
    const daysSinceLog = Math.max(
      0,
      (Date.now() - new Date(lastDailyLogDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    logRecencyScore = Math.max(0, 100 - (daysSinceLog / 7) * 100);
  }

  const clampedScore = Math.max(
    0,
    Math.min(100, Math.round(milestoneScore * 0.5 + overdueScore * 0.3 + logRecencyScore * 0.2)),
  );
  const status: 'green' | 'yellow' | 'red' =
    clampedScore > 80 ? 'green' : clampedScore >= 50 ? 'yellow' : 'red';
  return { score: clampedScore, status };
}

type AllData = {
  projects: Array<{
    id: string;
    project_name: string;
    project_number: string;
    status: string;
    start_date: string | null;
    target_completion_date: string | null;
  }>;
  allMilestones: Array<{
    id: string;
    project_id: string;
    milestone_name: string;
    planned_date: string;
    status: string;
  }>;
  allTasks: Array<{
    id: string;
    project_id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string;
  }>;
  allLogs: Array<{ project_id: string; log_date: string }>;
};

function buildDashboardData(data: AllData): PMDashboardResponse {
  const { projects, allMilestones, allTasks, allLogs } = data;
  const now = new Date();
  const nowISO = now.toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const projectMap = new Map(projects.map((p) => [p.id, p.project_name]));

  const projectHealthCards: PMProjectHealth[] = projects.map((project) => {
    const projectMilestones = allMilestones.filter((m) => m.project_id === project.id);
    const milestoneTotal = projectMilestones.length;
    const milestoneCompleted = projectMilestones.filter((m) => m.status === 'completed').length;
    const overdueTaskCount = allTasks.filter(
      (t) =>
        t.project_id === project.id &&
        t.due_at &&
        t.due_at < nowISO &&
        t.status !== 'done' &&
        t.status !== 'completed',
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

  return { projects: projectHealthCards, upcomingMilestones, overdueTasks };
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function fetchProjectData(
  supabase: SupabaseClient,
  projectIds: string[],
): Promise<AllData | null> {
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
  if (projectsResult.error || milestonesResult.error || tasksResult.error || logsResult.error)
    return null;
  return {
    projects: projectsResult.data ?? [],
    allMilestones: milestonesResult.data ?? [],
    allTasks: tasksResult.data ?? [],
    allLogs: logsResult.data ?? [],
  };
}

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async ({ userId }) => {
  const userRoles = await getKrewpactRoles();
  const hasAccess = userRoles.some((r: unknown) => ALLOWED_ROLES.includes(String(r)));
  if (!hasAccess)
    throw forbidden('project_manager, operations_manager, or executive role required');

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  const { data: memberships, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', krewpactUserId ?? userId)
    .eq('role', 'manager')
    .is('left_at', null);

  if (memberError) throw dbError('Failed to fetch project assignments');

  const projectIds = (memberships ?? []).map((m: { project_id: string }) => m.project_id);
  if (projectIds.length === 0)
    return NextResponse.json({
      projects: [],
      upcomingMilestones: [],
      overdueTasks: [],
    } satisfies PMDashboardResponse);

  const data = await fetchProjectData(supabase, projectIds);
  if (!data) throw dbError('Failed to fetch PM dashboard data');

  return NextResponse.json(buildDashboardData(data) satisfies PMDashboardResponse);
});
