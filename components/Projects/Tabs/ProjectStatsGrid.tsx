'use client';

import { Building, Clock, DollarSign, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/hooks/useProjects';

interface Props {
  project: Project;
  budgetProgress: number;
  timeProgress: number;
  daysElapsed: number;
  totalDays: number;
}

export function ProjectStatsGrid({
  project,
  budgetProgress,
  timeProgress,
  daysElapsed,
  totalDays,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Baseline Budget</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(project.baseline_budget || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Current: ${(project.current_budget || 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{budgetProgress.toFixed(1)}%</div>
          <Progress value={budgetProgress} className="mt-2 h-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{timeProgress.toFixed(0)}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {daysElapsed} of {totalDays} days
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Badge className="text-base capitalize">
            {project.status?.replace('_', ' ') || 'Planning'}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
