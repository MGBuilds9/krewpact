'use client';

import { Building, Calendar, Clock, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
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
  const startStr = project.start_date
    ? new Date(project.start_date).toLocaleDateString()
    : 'Not set';
  const endStr = project.target_completion_date
    ? new Date(project.target_completion_date).toLocaleDateString()
    : 'Not set';

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Building}
              label="Project Number"
              value={project.project_number || 'Not specified'}
            />
            <InfoRow icon={MapPin} label="Location" value={formatAddress(project.site_address)} />
            <InfoRow icon={Calendar} label="Timeline" value={`${startStr} to ${endStr}`} />
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
