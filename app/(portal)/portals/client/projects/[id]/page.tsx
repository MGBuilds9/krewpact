import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';

interface ProjectDetail {
  id: string;
  project_name: string;
  project_number: string;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  site_address: Record<string, string> | null;
  baseline_budget?: number;
  current_budget?: number;
  permission_set: Record<string, boolean>;
}

async function getProjectDetail(id: string, token: string): Promise<ProjectDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/portal/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

interface Params {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

function ProjectHeader({ project }: { project: ProjectDetail }) {
  const address = project.site_address;
  const addressStr = address
    ? [address.street, address.city, address.province, address.postal_code]
        .filter(Boolean)
        .join(', ')
    : null;
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-1">{project.project_number}</p>
          <h1 className="text-2xl font-bold text-gray-900">{project.project_name}</h1>
          {addressStr && <p className="text-sm text-gray-500 mt-1">{addressStr}</p>}
        </div>
        <div className="text-right">
          <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 capitalize">
            {project.status.replace('_', ' ')}
          </span>
          {project.baseline_budget && (
            <p className="text-xs text-gray-400 mt-1">
              Budget: ${project.current_budget?.toLocaleString('en-CA')} CAD
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type TabDef = { key: string; label: string; always: boolean; permKey?: string };

function TabNav({
  tabs,
  activeTab,
  projectId,
}: {
  tabs: TabDef[];
  activeTab: string;
  projectId: string;
}) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-1 -mb-px">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/portals/client/projects/${projectId}?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function OverviewTab({ project }: { project: ProjectDetail }) {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-CA') : '—');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Started</p>
        <p className="text-gray-900 font-medium mt-1">{fmt(project.start_date)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Target Completion</p>
        <p className="text-gray-900 font-medium mt-1">{fmt(project.target_completion_date)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
        <p className="text-gray-900 font-medium mt-1 capitalize">
          {project.status.replace('_', ' ')}
        </p>
      </div>
    </div>
  );
}

export default async function PortalProjectDetailPage({ params, searchParams }: Params) {
  const { userId } = await auth();
  if (!userId) redirect('/auth');

  const { id } = await params;
  const { tab = 'overview' } = await searchParams;

  const { auth: serverAuth } = await import('@clerk/nextjs/server');
  const { getToken } = await serverAuth();
  const token = await getToken();

  const project = await getProjectDetail(id, token ?? '');
  if (!project) notFound();

  const ALL_TABS: TabDef[] = [
    { key: 'overview', label: 'Overview', always: true },
    { key: 'documents', label: 'Documents', always: false, permKey: 'view_documents' },
    { key: 'change-orders', label: 'Change Orders', always: true },
    { key: 'invoices', label: 'Invoices', always: false, permKey: 'view_financials' },
    { key: 'messages', label: 'Messages', always: true },
  ];
  const tabs = ALL_TABS.filter((t) => t.always || project.permission_set[t.permKey || '']);

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <TabNav tabs={tabs} activeTab={tab} projectId={id} />
      <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm min-h-[300px]">
        {tab === 'overview' ? (
          <OverviewTab project={project} />
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Content for the <strong className="mx-1">{tab}</strong> tab loads here.
          </div>
        )}
      </div>
    </div>
  );
}
