'use client';

import {
  Activity,
  Clock,
  Download,
  ListChecks,
  Play,
  RefreshCw,
  Search,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, useSequences } from '@/hooks/useCRM';
import type { ApolloSearchProfile } from '@/lib/integrations/apollo-profiles';
import { MDM_SEARCH_PROFILES } from '@/lib/integrations/apollo-profiles';

const STAGE_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  qualified: 'bg-blue-100 text-blue-700 border-blue-200',
  estimating: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  proposal_sent: 'bg-purple-100 text-purple-700 border-purple-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

function formatStage(s: string) {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

interface ActionButtonProps {
  label: string;
  endpoint: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
}
function ActionButton({ label, endpoint, icon, variant = 'outline' }: ActionButtonProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');

  async function handleClick() {
    setStatus('running');
    try {
      const res = await fetch(endpoint, { method: 'POST', credentials: 'include' });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const LABELS: Record<string, string> = { running: 'Running...', done: 'Done', error: 'Failed' };
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      disabled={status === 'running'}
      className="gap-2"
    >
      {status === 'running' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : icon}
      {LABELS[status] ?? label}
    </Button>
  );
}

interface ApolloPreviewResult {
  id: string;
  name: string;
  email: string | null;
  title: string;
  company: string | null;
  industry: string | null;
  city: string | null;
}
type SearchStatus = 'idle' | 'searching' | 'previewing' | 'importing';
interface PreviewResultsProps {
  results: ApolloPreviewResult[];
  searchStatus: SearchStatus;
  autoEnroll: boolean;
  setAutoEnroll: (v: boolean) => void;
  onImport: () => void;
}
function PreviewResults({
  results,
  searchStatus,
  autoEnroll,
  setAutoEnroll,
  onImport,
}: PreviewResultsProps) {
  if (searchStatus !== 'previewing' && searchStatus !== 'importing') return null;
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No results found for this profile.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{results.length} results found</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoEnroll}
              onChange={(e) => setAutoEnroll(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-enroll in sequence
          </label>
          <Button
            size="sm"
            onClick={onImport}
            disabled={searchStatus === 'importing'}
            className="gap-2"
          >
            {searchStatus === 'importing' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Import {results.length} Leads
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Title</th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Company</th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Email</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.title}</td>
                <td className="py-2 pr-4">{r.company ?? '—'}</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PipelineStats({
  newLeadsCount,
  activeSequenceCount,
  totalLeads,
}: {
  newLeadsCount: number;
  activeSequenceCount: number;
  totalLeads: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Zap className="h-4 w-4" /> Apollo Pump
          </div>
          <div className="text-2xl font-bold">—</div>
          <p className="text-xs text-muted-foreground mt-1">No runs recorded</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4" /> Enrichment Queue
          </div>
          <div className="text-2xl font-bold">{newLeadsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Pending leads</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ListChecks className="h-4 w-4" /> Active Sequences
          </div>
          <div className="text-2xl font-bold">{activeSequenceCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Running sequences</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" /> Total Leads
          </div>
          <div className="text-2xl font-bold">{totalLeads}</div>
          <p className="text-xs text-muted-foreground mt-1">In pipeline</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ApolloSearchCardProps {
  selectedProfile: ApolloSearchProfile | null;
  searchStatus: SearchStatus;
  previewResults: ApolloPreviewResult[];
  autoEnroll: boolean;
  verticalStats: Record<string, number>;
  setSelectedProfile: (p: ApolloSearchProfile | null) => void;
  setPreviewResults: (r: ApolloPreviewResult[]) => void;
  setSearchStatus: (s: SearchStatus) => void;
  setAutoEnroll: (v: boolean) => void;
  onSearch: () => void;
  onImport: () => void;
}
function ApolloSearchCard({
  selectedProfile,
  searchStatus,
  previewResults,
  autoEnroll,
  verticalStats,
  setSelectedProfile,
  setPreviewResults,
  setSearchStatus,
  setAutoEnroll,
  onSearch,
  onImport,
}: ApolloSearchCardProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Apollo Profile Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="profile-select"
                className="text-sm font-medium text-muted-foreground mb-1 block"
              >
                Search Profile
              </label>
              <select
                id="profile-select"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProfile?.id ?? ''}
                onChange={(e) => {
                  const profile = MDM_SEARCH_PROFILES.find((p) => p.id === e.target.value);
                  setSelectedProfile(profile ?? null);
                  setPreviewResults([]);
                  setSearchStatus('idle');
                }}
              >
                <option value="">Select a profile...</option>
                {MDM_SEARCH_PROFILES.filter((p) => p.isActive).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.divisionCode} / {p.vertical})
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              onClick={onSearch}
              disabled={!selectedProfile || searchStatus === 'searching'}
              className="gap-2"
            >
              {searchStatus === 'searching' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {searchStatus === 'searching' ? 'Searching...' : 'Run Search'}
            </Button>
          </div>
          <PreviewResults
            results={previewResults}
            searchStatus={searchStatus}
            autoEnroll={autoEnroll}
            setAutoEnroll={setAutoEnroll}
            onImport={onImport}
          />
        </CardContent>
      </Card>
      {Object.keys(verticalStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Vertical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(verticalStats).map(([name, count]) => (
                <Badge key={name} variant="secondary" className="text-sm py-1 px-3">
                  {name}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

type LeadItem = NonNullable<ReturnType<typeof useLeads>['data']>['data'][number];
function RecentLeadsTable({ leads }: { leads: LeadItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Leads</span>
          <Badge variant="secondary">{leads.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No leads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lead</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Source</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Score</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Stage</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium truncate max-w-[160px]">{lead.company_name}</div>
                      {lead.industry && (
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {lead.industry}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {lead.source_channel ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {lead.lead_score != null ? lead.lead_score : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${STAGE_BADGE_COLORS[lead.status] ?? ''}`}
                      >
                        {formatStage(lead.status)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                      {formatRelativeTime(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SearchHandlerDeps {
  profileId: string;
  setSearchStatus: (s: SearchStatus) => void;
  setPreviewResults: (r: ApolloPreviewResult[]) => void;
}
async function apolloFetch(profileId: string, importMode: boolean) {
  return fetch('/api/crm/leads/apollo-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ profileId, ...(importMode ? { import: true } : {}) }),
  });
}
async function runApolloSearch({
  profileId,
  setSearchStatus,
  setPreviewResults,
}: SearchHandlerDeps) {
  setSearchStatus('searching');
  try {
    const res = await apolloFetch(profileId, false);
    if (!res.ok) {
      setSearchStatus('idle');
      return;
    }
    const data = await res.json();
    setPreviewResults(data.results ?? []);
    setSearchStatus('previewing');
  } catch {
    setSearchStatus('idle');
  }
}
async function runApolloImport({
  profileId,
  setSearchStatus,
  setPreviewResults,
}: SearchHandlerDeps) {
  setSearchStatus('importing');
  try {
    const res = await apolloFetch(profileId, true);
    if (res.ok) {
      setPreviewResults([]);
      setSearchStatus('idle');
    } else setSearchStatus('previewing');
  } catch {
    setSearchStatus('previewing');
  }
}

export default function LeadGenDashboardPage() {
  const { data: leadsResponse, isLoading: leadsLoading } = useLeads({ limit: 10 });
  const { data: sequences, isLoading: seqLoading } = useSequences({ isActive: true });

  const [selectedProfile, setSelectedProfile] = useState<ApolloSearchProfile | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [previewResults, setPreviewResults] = useState<ApolloPreviewResult[]>([]);
  const [autoEnroll, setAutoEnroll] = useState(true);

  const isLoading = leadsLoading || seqLoading;
  const deps = { profileId: selectedProfile?.id ?? '', setSearchStatus, setPreviewResults };
  const handleSearch = () => {
    if (selectedProfile) runApolloSearch(deps);
  };
  const handleImport = () => {
    if (selectedProfile) runApolloImport(deps);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['s1', 's2', 's3', 's4'].map((id) => (
            <Skeleton key={id} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allLeads = leadsResponse?.data ?? [];
  const allSequences = sequences ?? [];
  const newLeads = allLeads.filter((l) => l.status === 'new');
  const activeSequenceCount = allSequences.length;

  const verticalStats = MDM_SEARCH_PROFILES.reduce(
    (acc, profile) => {
      const count = allLeads.filter(
        (l) =>
          l.source_channel === 'apollo' &&
          (l as unknown as Record<string, unknown>).source_detail === profile.id,
      ).length;
      if (count > 0) acc[profile.name] = count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Generation Dashboard</h1>
          <p className="text-muted-foreground">Pipeline health and automation controls</p>
        </div>
      </div>

      <PipelineStats
        newLeadsCount={newLeads.length}
        activeSequenceCount={activeSequenceCount}
        totalLeads={allLeads.length}
      />

      <ApolloSearchCard
        selectedProfile={selectedProfile}
        searchStatus={searchStatus}
        previewResults={previewResults}
        autoEnroll={autoEnroll}
        verticalStats={verticalStats}
        setSelectedProfile={setSelectedProfile}
        setPreviewResults={setPreviewResults}
        setSearchStatus={setSearchStatus}
        setAutoEnroll={setAutoEnroll}
        onSearch={handleSearch}
        onImport={handleImport}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              label="Run Apollo Pump"
              endpoint="/api/cron/apollo-pump"
              icon={<Play className="h-3.5 w-3.5" />}
            />
            <ActionButton
              label="Process Enrichment"
              endpoint="/api/cron/enrichment"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            />
            <ActionButton
              label="Process Sequences"
              endpoint="/api/cron/sequences"
              icon={<ListChecks className="h-3.5 w-3.5" />}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These actions trigger cron jobs manually. Results appear in the Supabase logs.
          </p>
        </CardContent>
      </Card>

      <RecentLeadsTable leads={allLeads} />
    </div>
  );
}
