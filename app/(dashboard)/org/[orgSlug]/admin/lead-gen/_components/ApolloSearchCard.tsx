'use client';

import { Download, RefreshCw, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApolloSearchProfile } from '@/lib/integrations/apollo-profiles';
import { MDM_SEARCH_PROFILES } from '@/lib/integrations/apollo-profiles';

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

export function ApolloSearchCard({
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
