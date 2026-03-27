'use client';

import { ChevronRight, FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { useProjects } from '@/hooks/useProjects';
import { formatStatus } from '@/lib/format-status';

type Project = NonNullable<ReturnType<typeof useProjects>['data']>[number];

interface ProjectListViewProps {
  projects: Project[];
  loading: boolean;
  debouncedSearch: string;
  onSelect: (id: string) => void;
}

export function ProjectListView({
  projects,
  loading,
  debouncedSearch,
  onSelect,
}: ProjectListViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => (
          <Skeleton key={id} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No projects found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {debouncedSearch
              ? `No projects match "${debouncedSearch}"`
              : 'Create a project to start managing documents'}
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect(project.id)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">{project.project_name}</h3>
                  <p className="text-xs text-muted-foreground">{project.project_number}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-3">
              <Badge variant="outline" className="text-xs capitalize">
                {formatStatus(project.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
