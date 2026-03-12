'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, MapPin, Calendar, DollarSign, Search } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useDivision } from '@/contexts/DivisionContext';
import { ProjectCreationDialog } from '@/components/Projects/ProjectCreationDialog';
import { cn } from '@/lib/utils';

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
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const { activeDivision } = useDivision();
  const { data: projects, isLoading } = useProjects({ divisionId: activeDivision?.id });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = (projects ?? []).filter((project) => {
    const siteAddressStr =
      typeof project.site_address === 'object'
        ? (project.site_address as Record<string, string>)?.street || ''
        : '';

    const matchesSearch =
      !search ||
      project.project_name.toLowerCase().includes(search.toLowerCase()) ||
      project.project_number?.toLowerCase().includes(search.toLowerCase()) ||
      siteAddressStr.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Projects — KrewPact</title>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
              <p className="text-muted-foreground">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <ProjectCreationDialog />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project List */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {projects?.length === 0 ? 'No projects yet' : 'No matching projects'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {projects?.length === 0
                  ? 'Create your first project to get started'
                  : 'Try adjusting your search or filters'}
              </p>
              {projects?.length === 0 && <ProjectCreationDialog />}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer bg-white dark:bg-card border-0 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden relative flex flex-col h-full"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div
                  className={cn(
                    'absolute top-0 left-0 w-full h-1.5',
                    getStatusColor(project.status || ''),
                  )}
                />
                <CardContent className="p-6 flex-1 flex flex-col pt-8">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {project.project_name}
                        </h3>
                        {project.project_number && (
                          <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                            #{project.project_number}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'capitalize flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full',
                          project.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : project.status === 'planning'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : project.status === 'on_hold'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                                : project.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {project.status?.replace('_', ' ') || 'planning'}
                      </Badge>
                    </div>

                    <div className="mt-auto space-y-3 pt-4 border-t border-border/40">
                      {project.site_address && (
                        <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/40" />
                          <span className="line-clamp-2">
                            {typeof project.site_address === 'object'
                              ? (project.site_address as Record<string, string>)?.street || ''
                              : ''}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                        {project.baseline_budget != null && (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <div className="p-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                              <DollarSign className="h-3.5 w-3.5" />
                            </div>
                            {new Intl.NumberFormat('en-CA', {
                              style: 'currency',
                              currency: 'CAD',
                              maximumFractionDigits: 0,
                            }).format(project.baseline_budget)}
                          </div>
                        )}
                        {project.start_date && (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            {formatDate(project.start_date, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
