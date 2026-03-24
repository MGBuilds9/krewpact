'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar, FolderKanban } from 'lucide-react';

import type { PMDashboardResponse } from '@/app/api/dashboard/pm/route';
import { ProjectHealthCard } from '@/components/Dashboard/ProjectHealthCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRBAC } from '@/hooks/useRBAC';
import { apiFetch } from '@/lib/api-client';
import { formatStatus } from '@/lib/format-status';

const PM_ROLES = ['project_manager', 'operations_manager', 'executive', 'platform_admin'];

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function PMDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

type MilestoneItem = PMDashboardResponse['upcomingMilestones'][number];
type TaskItem = PMDashboardResponse['overdueTasks'][number];

function MilestoneRow({ ms }: { ms: MilestoneItem }) {
  return (
    <div className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium truncate">{ms.milestone_name}</p>
        <p className="text-xs text-muted-foreground">{ms.project_name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs">
          {formatStatus(ms.status)}
        </Badge>
        <span className="text-xs text-muted-foreground">{ms.planned_date}</span>
      </div>
    </div>
  );
}

function OverdueTaskRow({ task }: { task: TaskItem }) {
  return (
    <div className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.project_name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
          {formatStatus(task.priority)}
        </Badge>
        <span className="text-xs text-red-600">Due {task.due_at.slice(0, 10)}</span>
      </div>
    </div>
  );
}

function MilestonesCard({ milestones }: { milestones: MilestoneItem[] }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Milestones (7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming milestones.</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((ms) => (
              <MilestoneRow key={ms.id} ms={ms} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverdueTasksCard({ tasks }: { tasks: TaskItem[] }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Overdue Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue tasks. Great work!</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <OverdueTaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PMDashboardPage() {
  const { hasRole, isLoading: rbacLoading } = useUserRBAC();

  const { data, isLoading } = useQuery({
    queryKey: ['pm-dashboard'],
    queryFn: () => apiFetch<PMDashboardResponse>('/api/dashboard/pm'),
    staleTime: 30_000,
    enabled: !rbacLoading,
  });

  if (rbacLoading || isLoading) return <PMDashboardSkeleton />;

  const canView = PM_ROLES.some((r) => hasRole(r));
  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          The project manager dashboard is restricted to PM, operations, and executive roles.
        </p>
      </div>
    );
  }

  const projects = data?.projects ?? [];
  const upcomingMilestones = data?.upcomingMilestones ?? [];
  const overdueTasks = data?.overdueTasks ?? [];

  return (
    <>
      <title>PM Dashboard — KrewPact</title>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Project Manager Dashboard</h1>
        </div>

        {projects.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No projects assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectHealthCard
                key={project.id}
                projectName={project.project_name}
                projectNumber={project.project_number}
                healthScore={project.healthScore}
                healthStatus={project.healthStatus}
                milestoneTotal={project.milestoneTotal}
                milestoneCompleted={project.milestoneCompleted}
                overdueTaskCount={project.overdueTaskCount}
                daysSinceLastLog={daysSince(project.lastDailyLogDate)}
              />
            ))}
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <MilestonesCard milestones={upcomingMilestones} />
          <OverdueTasksCard tasks={overdueTasks} />
        </div>
      </div>
    </>
  );
}
