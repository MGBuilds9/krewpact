import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Projects',
  description: 'View your active projects and their current status.',
};

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface PortalProject {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  permission_set: Record<string, boolean>;
}

interface PortalData {
  portal_account: { id: string; actor_type: string; company_name: string };
  projects: PortalProject[];
}

async function getPortalProjects(): Promise<PortalData | null> {
  const { auth: serverAuth } = await import('@clerk/nextjs/server');
  const { getToken } = await serverAuth();
  const token = await getToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/portal/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
  completed: 'bg-emerald-100 text-emerald-800',
};

function ProjectCard({ project }: { project: PortalProject }) {
  const statusColor = STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-500';
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-CA');
  return (
    <a
      href={`/portals/client/projects/${project.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
          <h3 className="font-semibold text-gray-900 mt-0.5 group-hover:text-blue-700 transition-colors">
            {project.project_name}
          </h3>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        {project.start_date && (
          <div className="flex justify-between">
            <span>Started</span>
            <span>{fmt(project.start_date)}</span>
          </div>
        )}
        {project.target_completion_date && !project.actual_completion_date && (
          <div className="flex justify-between">
            <span>Target completion</span>
            <span>{fmt(project.target_completion_date)}</span>
          </div>
        )}
        {project.actual_completion_date && (
          <div className="flex justify-between text-emerald-600">
            <span>Completed</span>
            <span>{fmt(project.actual_completion_date)}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.permission_set.view_documents && (
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            Documents
          </span>
        )}
        {project.permission_set.approve_change_orders && (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            CO Approvals
          </span>
        )}
        {project.permission_set.view_financials && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
            Financials
          </span>
        )}
      </div>
    </a>
  );
}

export default async function PortalProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth');

  const data = await getPortalProjects();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-semibold text-gray-700">No project access found</h2>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          Your portal account hasn&apos;t been linked to any projects yet. Contact your project
          manager to get access.
        </p>
      </div>
    );
  }

  const { portal_account, projects } = data;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white">
        <p className="text-slate-400 text-sm font-medium">Welcome back</p>
        <h1 className="text-2xl font-bold mt-1">{portal_account.company_name}</h1>
        <p className="text-slate-300 text-sm mt-2 capitalize">
          {portal_account.actor_type.replace('_', ' ')} Portal · {projects.length} project
          {projects.length !== 1 ? 's' : ''} assigned
        </p>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400">No projects are currently assigned to your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
