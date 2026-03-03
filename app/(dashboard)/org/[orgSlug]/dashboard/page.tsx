'use client';

import { useUser } from '@clerk/nextjs';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Settings,
  DollarSign,
  ClipboardList,
  FolderOpen,
  Briefcase,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useUserRBAC } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import InboxPreview from '@/components/Dashboard/InboxPreview';
import CalendarWidget from '@/components/Dashboard/CalendarWidget';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'planning':
      return 'bg-blue-500';
    case 'on_hold':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

export default function DashboardPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { push: orgPush } = useOrgRouter();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { roles } = useUserRBAC();

  const isLoading = !userLoaded || dashboardLoading;
  const userName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'there';

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const atAGlance = dashboard?.atAGlance;
  const recentProjects = dashboard?.recentProjects ?? [];

  return (
    <>
      <title>Dashboard — KrewPact</title>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* A. Greeting + Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {getTimeGreeting()}, {userName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Badge
                    key={role.role_name}
                    variant={role.is_primary ? 'default' : 'secondary'}
                    className="text-xs font-medium"
                  >
                    {role.role_name
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs font-medium">
                  Employee
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => orgPush('/notifications')}
              className="relative"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Notifications
              {(atAGlance?.unreadNotifications ?? 0) > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {atAGlance?.unreadNotifications}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => orgPush('/settings')}>
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
          </div>
        </div>

        {/* B. At-a-Glance Summary */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
            onClick={() => orgPush('/projects')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{atAGlance?.activeProjects ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
            onClick={() => orgPush('/expenses')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{atAGlance?.pendingExpenses ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Expenses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
            onClick={() => orgPush('/crm/leads')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{atAGlance?.openLeads ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Open Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
            onClick={() => orgPush('/notifications')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{atAGlance?.unreadNotifications ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* C. Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 border-l-4 border-l-green-500"
            onClick={() => orgPush('/expenses')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Log Expense</p>
                <p className="text-xs text-muted-foreground">Track receipts</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 border-l-4 border-l-blue-500"
            onClick={() => orgPush('/reports/new')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">New Report</p>
                <p className="text-xs text-muted-foreground">Submit report</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 border-l-4 border-l-purple-500"
            onClick={() => orgPush('/documents')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FolderOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Documents</p>
                <p className="text-xs text-muted-foreground">Files & uploads</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-primary/50 transition-all duration-200 border-l-4 border-l-orange-500"
            onClick={() => orgPush('/projects')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Projects</p>
                <p className="text-xs text-muted-foreground">View projects</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* D. Recent Projects */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Recent Projects
              </span>
              <Button variant="ghost" size="sm" onClick={() => orgPush('/projects')}>
                View all
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No projects yet</p>
                <p className="text-sm mt-1">Create your first project to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all duration-200 border"
                    onClick={() => orgPush(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full flex-shrink-0',
                          getStatusColor(project.status),
                        )}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{project.project_name}</p>
                        {project.site_address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {typeof project.site_address === 'object'
                              ? (project.site_address as Record<string, string>)?.street || ''
                              : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">
                        {project.status.replace('_', ' ')}
                      </Badge>
                      {project.baseline_budget && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          ${(project.baseline_budget / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* E. Calendar + Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CalendarWidget />
          <InboxPreview />
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 pt-2 pb-2 tracking-wide select-none">
          Built by MKG Builds
        </p>
      </div>
    </>
  );
}
