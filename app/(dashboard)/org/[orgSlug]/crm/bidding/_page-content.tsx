'use client';

import { Gavel, Plus, Search, Upload } from 'lucide-react';
import { useState } from 'react';

import { BiddingCard } from '@/components/CRM/BiddingCard';
import { BidImportDialog } from '@/components/CRM/BidImportDialog';
import { BidToOpportunityButton } from '@/components/CRM/BidToOpportunityButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBiddingOpportunities } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { BIDDING_SOURCES, BIDDING_STATUSES, getSourceLabel } from '@/lib/crm/bidding';

function buildParams(
  search: string,
  statusFilter: string,
  sourceFilter: string,
): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (sourceFilter) params.source = sourceFilter;
  return Object.keys(params).length > 0 ? params : undefined;
}

// eslint-disable-next-line max-lines-per-function
export default function BiddingListPage() {
  const { push: orgPush } = useOrgRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading } = useBiddingOpportunities(
    buildParams(search, statusFilter, sourceFilter),
  );
  const bids = data ? data.data || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gavel className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bidding Opportunities</h2>
            <p className="text-muted-foreground">
              Track and manage bids from MERX, Bids &amp; Tenders, and more
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import Bids
          </Button>
          <Button onClick={() => orgPush('/crm/bidding/new')}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Bid
          </Button>
        </div>
      </div>
      <BidImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bids..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BIDDING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {BIDDING_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {getSourceLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'].map((id) => (
            <div key={id} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gavel className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No bidding opportunities found.</p>
          <Button variant="link" className="mt-2" onClick={() => orgPush('/crm/bidding/new')}>
            Create your first bid
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bids.map((bid) => (
            <div key={bid.id} className="relative">
              <BiddingCard bid={bid} onClick={() => orgPush(`/crm/bidding/${bid.id}`)} />
              <div className="absolute bottom-3 right-3" onClick={(e) => e.stopPropagation()}>
                <BidToOpportunityButton
                  bid={bid}
                  onConverted={() => orgPush('/crm/opportunities')}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {bids.length} of {data.total} bids
        </p>
      )}
    </div>
  );
}
