'use client';

import { AlertTriangle, Calendar, ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ProjectHealthCardProps {
  projectName: string;
  projectNumber: string;
  healthScore: number;
  healthStatus: 'green' | 'yellow' | 'red';
  milestoneTotal: number;
  milestoneCompleted: number;
  overdueTaskCount: number;
  daysSinceLastLog: number | null;
}

const statusConfig = {
  green: {
    label: 'Healthy',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    progressClass: '[&>div]:bg-green-500',
  },
  yellow: {
    label: 'At Risk',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    progressClass: '[&>div]:bg-yellow-500',
  },
  red: {
    label: 'Critical',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    progressClass: '[&>div]:bg-red-500',
  },
};

export function ProjectHealthCard({
  projectName,
  projectNumber,
  healthScore,
  healthStatus,
  milestoneTotal,
  milestoneCompleted,
  overdueTaskCount,
  daysSinceLastLog,
}: ProjectHealthCardProps) {
  const config = statusConfig[healthStatus];
  const milestonePercent =
    milestoneTotal > 0 ? Math.round((milestoneCompleted / milestoneTotal) * 100) : 0;

  return (
    <Card
      className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card"
      data-testid="project-health-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold truncate">{projectName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{projectNumber}</p>
          </div>
          <Badge data-testid="health-badge" className={cn('shrink-0', config.badgeClass)}>
            {config.label} {healthScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Milestone progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              Milestones
            </span>
            <span className="font-medium">
              {milestoneCompleted}/{milestoneTotal}
            </span>
          </div>
          <Progress
            value={milestonePercent}
            className={cn('h-2', config.progressClass)}
            data-testid="milestone-progress"
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm">
          <div
            className={cn(
              'flex items-center gap-1.5',
              overdueTaskCount > 0 ? 'text-red-600' : 'text-muted-foreground',
            )}
            data-testid="overdue-count"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              {overdueTaskCount} overdue {overdueTaskCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground" data-testid="last-log">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {daysSinceLastLog === null
                ? 'No logs'
                : daysSinceLastLog === 0
                  ? 'Logged today'
                  : `${daysSinceLastLog}d ago`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
