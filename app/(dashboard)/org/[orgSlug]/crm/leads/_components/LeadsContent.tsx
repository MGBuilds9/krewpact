'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus } from 'lucide-react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Lead } from '@/hooks/useCRM';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

import { formatStage, LeadCard } from './LeadCard';

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
      const colorClass =
        score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';
      return <span className={cn('font-medium', colorClass)}>{score}</span>;
    },
  },
  { accessorKey: 'industry', header: 'Industry', cell: ({ row }) => row.original.industry || '-' },
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
      row.original.source_channel ? formatStatus(row.original.source_channel) : '-',
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

export interface LeadsContentProps {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  viewMode: string;
  sort: SortState | null;
  selectedIds: string[];
  onSetPage: (p: number) => void;
  onSetPageSize: (s: number) => void;
  onSetSort: (s: SortState | null) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onNavigate: (id: string) => void;
}

// eslint-disable-next-line max-lines-per-function
export function LeadsContent({
  leads,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  viewMode,
  sort,
  selectedIds,
  onSetPage,
  onSetPageSize,
  onSetSort,
  onToggleSelect,
  onToggleSelectAll,
  onNavigate,
}: LeadsContentProps) {
  if (leads.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No leads yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first lead to start building your pipeline
          </p>
        </CardContent>
      </Card>
    );
  }
  if (viewMode === 'table') {
    return (
      <DataTable<Lead>
        columns={leadColumns}
        data={leads}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onSetPage}
        onPageSizeChange={onSetPageSize}
        onSortChange={onSetSort}
        currentSort={sort}
        onRowClick={(lead) => onNavigate(lead.id)}
        isLoading={isLoading}
      />
    );
  }
  return (
    <>
      {leads.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedIds.length === leads.length}
            onCheckedChange={onToggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            selected={selectedIds.includes(lead.id)}
            onSelect={onToggleSelect}
            onNavigate={onNavigate}
          />
        ))}
      </div>
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
            onClick={() => onSetPage(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {totalPages > 0 ? page + 1 : 0} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
