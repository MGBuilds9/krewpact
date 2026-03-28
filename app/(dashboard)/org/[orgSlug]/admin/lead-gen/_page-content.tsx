'use client';

import { Activity, ListChecks, Play, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, useSequences } from '@/hooks/useCRM';
import type { ApolloSearchProfile } from '@/lib/integrations/apollo-profiles';
import { MDM_SEARCH_PROFILES } from '@/lib/integrations/apollo-profiles';

import { ActionButton } from './_components/ActionButton';
import { ApolloSearchCard } from './_components/ApolloSearchCard';
import { PipelineStats } from './_components/PipelineStats';
import { RecentLeadsTable } from './_components/RecentLeadsTable';

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

// eslint-disable-next-line max-lines-per-function
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
