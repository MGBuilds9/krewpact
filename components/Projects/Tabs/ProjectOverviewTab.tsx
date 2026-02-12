'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  Calendar,
  MapPin,
  User,
  Building,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Project } from '@/hooks/useProjects';

interface ProjectOverviewTabProps {
  project: Project;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const budgetProgress = project.budget ? ((project.spent || 0) / project.budget) * 100 : 0;
  const [now] = React.useState(() => Date.now());
  const daysElapsed = React.useMemo(
    () =>
      project.start_date
        ? Math.floor((now - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    [project.start_date, now],
  );
  const totalDays =
    project.start_date && project.end_date
      ? Math.floor(
          (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) /
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
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(project.budget || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(project.spent || 0).toLocaleString()} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Progress</CardTitle>
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
                <p className="text-sm font-medium">Project Code</p>
                <p className="text-sm text-muted-foreground">{project.code || 'Not specified'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {project.address || 'Not specified'}
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
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description || 'No description provided'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Client Name</p>
                <p className="text-sm text-muted-foreground">
                  {project.client_name || 'Not specified'}
                </p>
              </div>
            </div>

            {project.client_email && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{project.client_email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    Manager Only
                  </Badge>
                </div>
              </div>
            )}

            {project.client_phone && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{project.client_phone}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    Manager Only
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
