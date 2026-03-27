'use client';

import { FolderKanban } from 'lucide-react';

import { ProjectHistoryCard } from '@/components/CRM/ProjectHistoryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useAccountProjects } from '@/hooks/useCRM';

type ProjectItem = NonNullable<ReturnType<typeof useAccountProjects>['data']>['data'][number];

interface ProjectsTabProps {
  projectHistory: ProjectItem[];
}

export function ProjectsTab({ projectHistory }: ProjectsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Project History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projectHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderKanban className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No project history found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectHistory.map((project) => (
              <ProjectHistoryCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
