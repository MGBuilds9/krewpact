'use client';

import { Calendar, Clock, Milestone as MilestoneIcon } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Milestone } from '@/hooks/useProjectExtended';
import { useProjectMilestones } from '@/hooks/useProjectExtended';
import { Project } from '@/hooks/useProjects';

interface ProjectTimelineTabProps {
  project: Project;
  projectId: string;
}

type MilestoneStatus = 'completed' | 'in_progress' | 'pending';

function getMilestoneStatusVariant(status: MilestoneStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'in_progress') return 'secondary';
  return 'outline';
}

function MilestoneItem({ milestone, isLast }: { milestone: Milestone; isLast: boolean }) {
  const status = (milestone.status || 'pending') as MilestoneStatus;
  const displayDate = milestone.actual_date ?? milestone.planned_date;
  const dotClass =
    status === 'completed'
      ? 'bg-primary border-primary'
      : status === 'in_progress'
        ? 'bg-secondary border-secondary'
        : 'bg-background border-border';
  const innerClass =
    status === 'completed'
      ? 'bg-primary-foreground'
      : status === 'in_progress'
        ? 'bg-secondary-foreground'
        : 'bg-muted';
  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div className="absolute left-[15px] top-[40px] bottom-[-32px] w-0.5 bg-border" />
      )}
      <div
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${dotClass}`}
      >
        <div className={`h-3 w-3 rounded-full ${innerClass}`} />
      </div>
      <div className="flex-1 pb-8">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">{milestone.milestone_name}</h4>
          <Badge variant={getMilestoneStatusVariant(status)}>{status.replace('_', ' ')}</Badge>
        </div>
        {displayDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(displayDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineSummary({ project }: { project: Project }) {
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.target_completion_date ? new Date(project.target_completion_date) : null;
  const [now] = React.useState(() => Date.now());
  const daysElapsed = startDate ? Math.floor((now - startDate.getTime()) / 86_400_000) : 0;
  const totalDays =
    startDate && endDate ? Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) : 0;
  const pct = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Start Date</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {startDate ? startDate.toLocaleDateString() : 'Not set'}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">End Date</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {endDate ? endDate.toLocaleDateString() : 'Not set'}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pct.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {daysElapsed} of {totalDays} days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectTimelineTab({ project, projectId }: ProjectTimelineTabProps) {
  const { data: milestones = [], isLoading } = useProjectMilestones(projectId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Timeline</h2>
      <TimelineSummary project={project} />
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded" />
              ))}
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MilestoneIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="font-medium">No milestones yet</p>
              <p className="text-sm mt-1">Milestones will appear here once added to this project</p>
            </div>
          ) : (
            <div className="relative space-y-8">
              {milestones.map((m: Milestone, i: number) => (
                <MilestoneItem key={m.id} milestone={m} isLast={i === milestones.length - 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
