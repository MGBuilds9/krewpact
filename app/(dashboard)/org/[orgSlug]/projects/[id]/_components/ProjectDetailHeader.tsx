'use client';

import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { Project } from '@/hooks/useProjects';
import { useDeleteProject } from '@/hooks/useProjects';

interface Props {
  project: Project;
  projectId: string;
}

export function ProjectDetailHeader({ project, projectId }: Props) {
  const { push: orgPush } = useOrgRouter();
  const deleteProject = useDeleteProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => orgPush('/projects')}
        className="mt-1"
        aria-label="Back to projects"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight truncate">{project.project_name}</h1>
          {project.project_number && (
            <Badge variant="outline" className="text-sm">
              {project.project_number}
            </Badge>
          )}
          <Badge className="capitalize">{(project.status || 'planning').replace('_', ' ')}</Badge>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Project actions">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => orgPush(`/projects/${projectId}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Project
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.project_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        reasonRequired={false}
        onConfirm={() => deleteProject.mutate(projectId, { onSuccess: () => orgPush('/projects') })}
      />
    </div>
  );
}
