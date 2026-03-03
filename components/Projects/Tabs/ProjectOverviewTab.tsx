'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Calendar, MapPin, Building, TrendingUp, Clock } from 'lucide-react';
import { Project } from '@/hooks/useProjects';

interface ProjectOverviewTabProps {
  project: Project;
}

function formatAddress(siteAddress: Record<string, string> | null): string {
  if (!siteAddress) return 'Not specified';
  const parts = [
    siteAddress.street,
    siteAddress.city,
    siteAddress.province,
    siteAddress.postal_code,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const budgetProgress = project.baseline_budget
    ? (project.current_budget / project.baseline_budget) * 100
    : 0;
  const [now] = React.useState(() => Date.now());
  const daysElapsed = React.useMemo(
    () =>
      project.start_date
        ? Math.floor((now - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    [project.start_date, now],
  );
  const totalDays =
    project.start_date && project.target_completion_date
      ? Math.floor(
          (new Date(project.target_completion_date).getTime() -
            new Date(project.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const timeProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
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

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Project Number</p>
                <p className="text-sm text-muted-foreground">
                  {project.project_number || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {formatAddress(project.site_address)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Timeline</p>
                <p className="text-sm text-muted-foreground">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString()
                    : 'Not set'}
                  {' to '}
                  {project.target_completion_date
                    ? new Date(project.target_completion_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account & Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {project.account_id ? `Account: ${project.account_id}` : 'No account linked'}
            </p>
            <p className="text-sm text-muted-foreground">
              {project.contact_id ? `Contact: ${project.contact_id}` : 'No contact linked'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
