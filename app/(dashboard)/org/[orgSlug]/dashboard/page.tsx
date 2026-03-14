'use client';

import { useUser } from '@clerk/nextjs';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
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
        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-min">
          {/* Main Welcome Bento (Large Hero-esque) */}
          <Card className="col-span-1 md:col-span-4 lg:col-span-4 row-span-2 bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-0 shadow-sm rounded-3xl overflow-hidden relative">
            <CardContent className="p-8 h-full flex flex-col justify-center">
              <div className="relative z-10">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                  {getTimeGreeting()}, {userName}
                </h1>
                <p className="text-muted-foreground text-lg mb-6 max-w-lg">
                  Welcome to Krewpact. Here is an overview of your current operations and pending
                  tasks for today.
                </p>
                <div className="flex gap-3 flex-wrap">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge
                        key={role.role_name}
                        variant={role.is_primary ? 'default' : 'secondary'}
                        className="text-sm px-3 py-1 rounded-full shadow-sm"
                      >
                        {role.role_name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="text-sm px-3 py-1 rounded-full shadow-sm">
                      Employee
                    </Badge>
                  )}
                </div>
              </div>
              {/* Optional: Add abstract geometric shapes here for visual interest */}
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mb-16 pointer-events-none" />
            </CardContent>
          </Card>

          {/* Quick Stats Column (Stacked) */}
          <div className="col-span-1 md:col-span-4 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            <Card
              className="group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden border-0 bg-white dark:bg-card relative"
              onClick={() => orgPush('/projects')}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400">
                    <Briefcase className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-bold tracking-tight group-hover:text-blue-600 transition-colors">
                    {atAGlance?.activeProjects ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Active Projects</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden border-0 bg-white dark:bg-card"
              onClick={() => orgPush('/expenses')}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-bold tracking-tight group-hover:text-green-600 transition-colors">
                    {atAGlance?.pendingExpenses ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Pending Expenses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <Card
            className="col-span-1 md:col-span-2 lg:col-span-2 group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-3xl border-0 bg-white dark:bg-card"
            onClick={() => orgPush('/crm/leads')}
          >
            <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <p className="text-3xl font-bold tracking-tight group-hover:text-purple-600 transition-colors">
                  {atAGlance?.openLeads ?? 0}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Open Leads</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400">
                <ClipboardList className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="col-span-1 md:col-span-2 lg:col-span-2 group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-3xl border-0 bg-white dark:bg-card"
            onClick={() => orgPush('/notifications')}
          >
            <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <p className="text-3xl font-bold tracking-tight group-hover:text-orange-600 transition-colors">
                  {atAGlance?.unreadNotifications ?? 0}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-1">Unread Alerts</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 relative">
                <Bell className="h-8 w-8" />
                {(atAGlance?.unreadNotifications ?? 0) > 0 && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-card animate-pulse" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions (Bento Links) */}
          <div className="col-span-1 md:col-span-4 lg:col-span-2 grid grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:shadow-md hover:scale-[1.05] transition-all duration-200 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white border-0"
              onClick={() => orgPush('/expenses')}
            >
              <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                <DollarSign className="h-8 w-8 mb-2 opacity-90" />
                <p className="font-semibold text-sm">Log Expense</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md hover:scale-[1.05] transition-all duration-200 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0"
              onClick={() => orgPush('/reports/new')}
            >
              <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                <ClipboardList className="h-8 w-8 mb-2 opacity-90" />
                <p className="font-semibold text-sm">New Report</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md hover:scale-[1.05] transition-all duration-200 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0"
              onClick={() => orgPush('/documents')}
            >
              <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                <FolderOpen className="h-8 w-8 mb-2 opacity-90" />
                <p className="font-semibold text-sm">Documents</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md hover:scale-[1.05] transition-all duration-200 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0"
              onClick={() => orgPush('/projects')}
            >
              <CardContent className="p-5 flex flex-col justify-center items-center text-center h-full">
                <Briefcase className="h-8 w-8 mb-2 opacity-90" />
                <p className="font-semibold text-sm">Projects</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* D. Recent Projects & Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 rounded-3xl border-0 shadow-sm overflow-hidden bg-white dark:bg-card">
            <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xl tracking-tight">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Recent Projects
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => orgPush('/projects')}
                  className="rounded-full hover:bg-primary/10"
                >
                  View all
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/5">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-lg">No projects yet</p>
                  <p className="text-sm mt-1">Create your first project to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-5 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => orgPush(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full flex-shrink-0 shadow-inner',
                            getStatusColor(project.status),
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-base truncate tracking-tight">
                            {project.project_name}
                          </p>
                          {project.site_address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {typeof project.site_address === 'object'
                                ? (project.site_address as Record<string, string>)?.street || ''
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs uppercase tracking-wider font-semibold rounded-full bg-background/50"
                        >
                          {project.status.replace('_', ' ')}
                        </Badge>
                        {project.baseline_budget && (
                          <span className="text-sm font-medium text-foreground hidden sm:inline">
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

          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-3xl overflow-hidden border-0 shadow-sm bg-white dark:bg-card">
              <CalendarWidget />
            </div>
            <div className="rounded-3xl overflow-hidden border-0 shadow-sm bg-white dark:bg-card">
              <InboxPreview />
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground pt-2 pb-2 tracking-wide select-none">
          Built by MKG Builds
        </p>
      </div>
    </>
  );
}
