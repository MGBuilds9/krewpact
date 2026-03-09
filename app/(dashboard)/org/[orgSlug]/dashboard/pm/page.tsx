'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectHealthCard } from '@/components/Dashboard/ProjectHealthCard';
import { apiFetch } from '@/lib/api-client';
import { useUserRBAC } from '@/hooks/useRBAC';
import { AlertTriangle, Calendar, FolderKanban } from 'lucide-react';
import type { PMDashboardResponse } from '@/app/api/dashboard/pm/route';

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
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

export default function PMDashboardPage() {
  const { hasRole, isLoading: rbacLoading } = useUserRBAC();

  const { data, isLoading } = useQuery({
    queryKey: ['pm-dashboard'],
    queryFn: () => apiFetch<PMDashboardResponse>('/api/dashboard/pm'),
    staleTime: 30_000,
    enabled: !rbacLoading,
  });

  const canView =
    hasRole('project_manager') ||
    hasRole('operations_manager') ||
    hasRole('executive') ||
    hasRole('platform_admin');

  if (rbacLoading || isLoading) {
    return <PMDashboardSkeleton />;
  }

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

        {/* Project Health Cards Grid */}
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

        {/* Bottom sections: Upcoming Milestones + Overdue Tasks */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Upcoming Milestones */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Milestones (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming milestones.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMilestones.map((ms) => (
                    <div
                      key={ms.id}
                      className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ms.milestone_name}</p>
                        <p className="text-xs text-muted-foreground">{ms.project_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {ms.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{ms.planned_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Tasks */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No overdue tasks. Great work!</p>
              ) : (
                <div className="space-y-3">
                  {overdueTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.project_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-red-600">Due {task.due_at.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
