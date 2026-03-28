'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { BulkActionBar } from '@/components/CRM/BulkActionBar';
import { type SortState } from '@/components/CRM/DataTable';
import { useViewMode, ViewToggle } from '@/components/CRM/ViewToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDivision } from '@/contexts/DivisionContext';
import { useLeads } from '@/hooks/useCRM';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { formatStage } from './_components/LeadCard';
import { LeadsContent } from './_components/LeadsContent';

const STATUS_OPTIONS = [
  'all',
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'nurture',
  'won',
  'lost',
];

// eslint-disable-next-line max-lines-per-function
export default function LeadsPageContent() {
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
    divisionId: activeDivision ? activeDivision.id : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort ? sort.field : undefined,
    sortDir: sort ? sort.direction : undefined,
  });

  const leads = useMemo(() => (response ? response.data || [] : []), [response]);
  const total = response ? response.total || 0 : 0;
  const totalPages = Math.ceil(total / pageSize);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.length === leads.length ? [] : leads.map((l) => l.id));
  }, [selectedIds.length, leads]);

  return (
    <div className="space-y-4">
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
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Statuses' : formatStage(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => orgPush('/crm/leads/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>
      <LeadsContent
        leads={leads}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        viewMode={viewMode}
        sort={sort}
        selectedIds={selectedIds}
        onSetPage={setPage}
        onSetPageSize={setPageSize}
        onSetSort={setSort}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onNavigate={(id) => orgPush(`/crm/leads/${id}`)}
      />
      <BulkActionBar
        selectedIds={selectedIds}
        entityType="lead"
        onClearSelection={() => setSelectedIds([])}
        onActionComplete={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
      />
    </div>
  );
}
