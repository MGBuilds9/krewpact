'use client';

import { useState, useCallback, useMemo } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, UserPlus, Users } from 'lucide-react';
import { useLeads, type Lead } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { ViewToggle, useViewMode } from '@/components/CRM/ViewToggle';
import { BulkActionBar } from '@/components/CRM/BulkActionBar';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  proposal: 'bg-purple-100 text-purple-700 border-purple-200',
  negotiation: 'bg-orange-100 text-orange-700 border-orange-200',
  nurture: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const leadColumns: ColumnDef<Lead, unknown>[] = [
  {
    accessorKey: 'company_name',
    header: 'Company Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.company_name || 'Unnamed Lead'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn('text-xs border', STATUS_BADGE_COLORS[row.original.status] || '')}
      >
        {formatStage(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: 'lead_score',
    header: 'Score',
    cell: ({ row }) => {
      const score = row.original.lead_score;
      if (score == null || score === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={cn(
            'font-medium',
            score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600',
          )}
        >
          {score}
        </span>
      );
    },
  },
  {
    accessorKey: 'industry',
    header: 'Industry',
    cell: ({ row }) => row.original.industry || '-',
  },
  {
    accessorKey: 'city',
    header: 'City',
    cell: ({ row }) => {
      const { city, province } = row.original;
      if (!city) return '-';
      return province ? `${city}, ${province}` : city;
    },
  },
  {
    accessorKey: 'source_channel',
    header: 'Source',
    cell: ({ row }) =>
      row.original.source_channel
        ? row.original.source_channel.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : '-',
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
  },
];

export default function LeadsPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [viewMode, setViewMode] = useViewMode();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: response, isLoading } = useLeads({
    divisionId: activeDivision?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort?.field,
    sortDir: sort?.direction,
  });

  const leads = useMemo(() => response?.data ?? [], [response?.data]);
  const total = response?.total ?? 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  }, [selectedIds.length, leads]);

  function handleBulkComplete() {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  if (isLoading && !response) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 animate-pulse" />
          <Skeleton className="h-10 w-36 animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Leads — KrewPact</title>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
              <p className="text-muted-foreground text-sm">
                {total} lead{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="nurture">Nurture</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => orgPush('/crm/leads/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </div>

        {/* Content */}
        {leads.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first lead to start building your pipeline
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <DataTable<Lead>
            columns={leadColumns}
            data={leads}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            currentSort={sort}
            onRowClick={(lead) => orgPush(`/crm/leads/${lead.id}`)}
            isLoading={isLoading}
          />
        ) : (
          <>
            {/* Select All for card view */}
            {leads.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={selectedIds.length === leads.length && leads.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
              {leads.map((lead) => (
                <Card
                  key={lead.id}
                  className={cn(
                    'group cursor-pointer bg-white dark:bg-card border-0 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-3xl overflow-hidden relative flex flex-col h-full',
                    selectedIds.includes(lead.id) && 'ring-2 ring-primary',
                  )}
                >
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex flex-col gap-4 flex-1">
                      <div className="flex justify-between items-start gap-3">
                        <div
                          className="min-w-0 flex-1"
                          onClick={() => orgPush(`/crm/leads/${lead.id}`)}
                        >
                          <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                            {lead.company_name || 'Unnamed Lead'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs flex-shrink-0 border',
                                STATUS_BADGE_COLORS[lead.status] || '',
                              )}
                            >
                              {formatStage(lead.status)}
                            </Badge>
                            {lead.is_qualified && (
                              <Badge className="text-[10px] font-bold tracking-wider uppercase bg-green-500 text-white flex-shrink-0">
                                Qualified
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 mt-1"
                        />
                      </div>

                      <div
                        className="mt-auto space-y-4 pt-4 border-t border-border/40"
                        onClick={() => orgPush(`/crm/leads/${lead.id}`)}
                      >
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground">
                          {lead.industry && (
                            <span className="flex items-center gap-1.5 text-foreground">
                              {lead.industry}
                            </span>
                          )}
                          {lead.city && (
                            <span className="flex items-center gap-1.5 text-foreground">
                              {lead.city}, {lead.province}
                            </span>
                          )}
                          {lead.lead_score != null && lead.lead_score > 0 && (
                            <span
                              className={cn(
                                'font-bold flex items-center gap-1.5',
                                lead.lead_score >= 80
                                  ? 'text-green-600'
                                  : lead.lead_score >= 50
                                    ? 'text-yellow-600'
                                    : 'text-red-600',
                              )}
                            >
                              Score: {lead.lead_score}
                            </span>
                          )}
                          <span className="text-muted-foreground/80 flex w-full justify-between items-center text-xs pt-1">
                            Added:
                            <span className="font-semibold text-foreground">
                              {new Date(lead.created_at).toLocaleDateString('en-CA', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Card view pagination */}
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-muted-foreground">
                {total > 0
                  ? `Showing ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} of ${total}`
                  : 'No results'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {Math.ceil(total / pageSize) > 0 ? page + 1 : 0} of{' '}
                  {Math.ceil(total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / pageSize) - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedIds={selectedIds}
          entityType="lead"
          onClearSelection={() => setSelectedIds([])}
          onActionComplete={handleBulkComplete}
        />
      </div>
    </>
  );
}
