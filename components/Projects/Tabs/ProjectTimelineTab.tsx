'use client';

import { Calendar, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/hooks/useProjects';

interface ProjectTimelineTabProps {
  project: Project;
}

type MilestoneStatus = 'completed' | 'in_progress' | 'pending';

function getMilestoneStatusVariant(status: MilestoneStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'in_progress') return 'secondary';
  return 'outline';
}

function buildMilestones(startDate: Date | null, endDate: Date | null) {
  const ms = 24 * 60 * 60 * 1000;
  return [
    {
      id: 1,
      title: 'Project Kickoff',
      date: startDate,
      status: 'completed' as MilestoneStatus,
      description: 'Initial project meeting and planning',
    },
    {
      id: 2,
      title: 'Design Phase',
      date: startDate ? new Date(startDate.getTime() + 14 * ms) : null,
      status: 'completed' as MilestoneStatus,
      description: 'Complete architectural and engineering designs',
    },
    {
      id: 3,
      title: 'Permits & Approvals',
      date: startDate ? new Date(startDate.getTime() + 30 * ms) : null,
      status: 'in_progress' as MilestoneStatus,
      description: 'Obtain all necessary permits and approvals',
    },
    {
      id: 4,
      title: 'Construction Start',
      date: startDate ? new Date(startDate.getTime() + 45 * ms) : null,
      status: 'pending' as MilestoneStatus,
      description: 'Begin physical construction work',
    },
    {
      id: 5,
      title: 'Mid-Project Review',
      date: startDate && endDate ? new Date((startDate.getTime() + endDate.getTime()) / 2) : null,
      status: 'pending' as MilestoneStatus,
      description: 'Review progress and adjust timeline if needed',
    },
    {
      id: 6,
      title: 'Final Inspection',
      date: endDate ? new Date(endDate.getTime() - 14 * ms) : null,
      status: 'pending' as MilestoneStatus,
      description: 'Final walkthrough and inspection',
    },
    {
      id: 7,
      title: 'Project Completion',
      date: endDate,
      status: 'pending' as MilestoneStatus,
      description: 'Project handover and closeout',
    },
  ];
}

function MilestoneItem({
  milestone,
  isLast,
}: {
  milestone: ReturnType<typeof buildMilestones>[number];
  isLast: boolean;
}) {
  const dotClass =
    milestone.status === 'completed'
      ? 'bg-primary border-primary'
      : milestone.status === 'in_progress'
        ? 'bg-secondary border-secondary'
        : 'bg-background border-border';
  const innerClass =
    milestone.status === 'completed'
      ? 'bg-primary-foreground'
      : milestone.status === 'in_progress'
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
          <h4 className="font-semibold">{milestone.title}</h4>
          <Badge variant={getMilestoneStatusVariant(milestone.status)}>
            {milestone.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
        {milestone.date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {milestone.date.toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectTimelineTab({ project }: ProjectTimelineTabProps) {
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.target_completion_date ? new Date(project.target_completion_date) : null;
  const today = new Date();
  const daysElapsed = startDate
    ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const totalDays =
    startDate && endDate
      ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
  const progressPercentage = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
  const milestones = buildMilestones(startDate, endDate);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Timeline</h2>
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
            <div className="text-2xl font-bold">{progressPercentage.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysElapsed} of {totalDays} days
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-8">
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                isLast={index === milestones.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
