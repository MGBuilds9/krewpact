'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  LayoutDashboard,
  ListTodo,
  Users,
  DollarSign,
  Clock,
  FileText,
  Receipt,
  ClipboardList,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { ProjectOverviewTab } from '@/components/Projects/Tabs/ProjectOverviewTab';
import { AiInsightBanner } from '@/components/AI';

const TabSkeleton = () => <Skeleton className="h-64 w-full rounded-xl" />;

const ProjectTasksTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectTasksTab').then((m) => m.ProjectTasksTab),
  { loading: TabSkeleton },
);
const ProjectTeamTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectTeamTab').then((m) => m.ProjectTeamTab),
  { loading: TabSkeleton },
);
const ProjectBudgetTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectBudgetTab').then((m) => m.ProjectBudgetTab),
  { loading: TabSkeleton },
);
const ProjectTimelineTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectTimelineTab').then((m) => m.ProjectTimelineTab),
  { loading: TabSkeleton },
);
const ProjectFilesTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectFilesTab').then((m) => m.ProjectFilesTab),
  { loading: TabSkeleton },
);
const ProjectExpensesTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectExpensesTab').then((m) => m.ProjectExpensesTab),
  { loading: TabSkeleton },
);
const ProjectReportsTab = dynamic(
  () => import('@/components/Projects/Tabs/ProjectReportsTab').then((m) => m.ProjectReportsTab),
  { loading: TabSkeleton },
);

export default function ProjectDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const projectId = params.id as string;
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Project not found</h2>
        <p className="text-muted-foreground mb-4">
          This project may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <Badge className="capitalize">{project.status?.replace('_', ' ') || 'planning'}</Badge>
          </div>
        </div>
      </div>

      <AiInsightBanner entityType="project" entityId={projectId} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Budget</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Files</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ProjectOverviewTab project={project} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <ProjectTeamTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="budget" className="mt-6">
          <ProjectBudgetTab project={project} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-6">
          <ProjectTimelineTab project={project} />
        </TabsContent>
        <TabsContent value="files" className="mt-6">
          <ProjectFilesTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ProjectExpensesTab projectId={projectId} />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ProjectReportsTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
