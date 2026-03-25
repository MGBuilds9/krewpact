'use client';

import {
  ArrowLeft,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  ListTodo,
  Receipt,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { AiInsightBanner } from '@/components/AI/AiInsightBanner';
import { ProjectOverviewTab } from '@/components/Projects/Tabs/ProjectOverviewTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useProject } from '@/hooks/useProjects';

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

const TABS = [
  { value: 'overview', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Overview' },
  { value: 'tasks', icon: <ListTodo className="h-4 w-4" />, label: 'Tasks' },
  { value: 'team', icon: <Users className="h-4 w-4" />, label: 'Team' },
  { value: 'budget', icon: <DollarSign className="h-4 w-4" />, label: 'Budget' },
  { value: 'timeline', icon: <Clock className="h-4 w-4" />, label: 'Timeline' },
  { value: 'files', icon: <FileText className="h-4 w-4" />, label: 'Files' },
  { value: 'expenses', icon: <Receipt className="h-4 w-4" />, label: 'Expenses' },
  { value: 'reports', icon: <ClipboardList className="h-4 w-4" />, label: 'Reports' },
];

type Project = NonNullable<ReturnType<typeof useProject>['data']>;

function TabContent({
  value,
  project,
  projectId,
}: {
  value: string;
  project: Project;
  projectId: string;
}) {
  if (value === 'overview') return <ProjectOverviewTab project={project} />;
  if (value === 'tasks') return <ProjectTasksTab projectId={projectId} />;
  if (value === 'team') return <ProjectTeamTab projectId={projectId} />;
  if (value === 'budget') return <ProjectBudgetTab project={project} />;
  if (value === 'timeline') return <ProjectTimelineTab project={project} />;
  if (value === 'files') return <ProjectFilesTab projectId={projectId} />;
  if (value === 'expenses') return <ProjectExpensesTab projectId={projectId} />;
  return <ProjectReportsTab projectId={projectId} />;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const projectId = params.id as string;
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading)
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

  if (!project)
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

  return (
    <div className="space-y-6">
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
      </div>
      <AiInsightBanner entityType="project" entityId={projectId} />
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <TabContent value={tab.value} project={project} projectId={projectId} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
