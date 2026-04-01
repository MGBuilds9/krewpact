'use client';

import { Building, Calendar, Clock, DollarSign, ExternalLink, MapPin, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAccount, useContact } from '@/hooks/useCRM';
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

function StatsGrid({
  project,
  budgetProgress,
  timeProgress,
  daysElapsed,
  totalDays,
}: {
  project: Project;
  budgetProgress: number;
  timeProgress: number;
  daysElapsed: number;
  totalDays: number;
}) {
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

function AccountContactCard({ project }: { project: Project }) {
  const { data: account } = useAccount(project.account_id ?? '');
  const { data: contact } = useContact(project.contact_id ?? '');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Account:</span>
          {project.account_id ? (
            <span className="font-medium">{account?.account_name ?? 'Loading...'}</span>
          ) : (
            <span className="text-muted-foreground">No account linked</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Contact:</span>
          {project.contact_id ? (
            <span className="font-medium">
              {contact ? `${contact.first_name} ${contact.last_name}` : 'Loading...'}
            </span>
          ) : (
            <span className="text-muted-foreground">No contact linked</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const budgetProgress = project.baseline_budget ? (project.current_budget / project.baseline_budget) * 100 : 0;
  const [now] = React.useState(() => Date.now());
  const ms = 86_400_000;
  const start = project.start_date ? new Date(project.start_date).getTime() : 0;
  const end = project.target_completion_date ? new Date(project.target_completion_date).getTime() : 0;
  const daysElapsed = start ? Math.floor((now - start) / ms) : 0;
  const totalDays = start && end ? Math.floor((end - start) / ms) : 0;
  const timeProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
  const startStr = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set';
  const endStr = project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : 'Not set';

  return (
    <div className="space-y-6">
      <StatsGrid
        project={project}
        budgetProgress={budgetProgress}
        timeProgress={timeProgress}
        daysElapsed={daysElapsed}
        totalDays={totalDays}
      />
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
        <AccountContactCard project={project} />
      </div>
    </div>
  );
}
