'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { Badge } from '@/components/ui/badge';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import type { Opportunity } from '@/hooks/crm/useOpportunities';
import { useDeleteOpportunity, useOpportunities } from '@/hooks/crm/useOpportunities';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { formatStatus } from '@/lib/format-status';

const STAGE_COLORS: Record<string, string> = {
  qualification: 'bg-blue-100 text-blue-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
};

const BASE_COLUMNS: ColumnDef<Opportunity, unknown>[] = [
  {
    accessorKey: 'opportunity_name',
    header: 'Opportunity',
    cell: ({ row }) => <span className="font-semibold">{row.original.opportunity_name}</span>,
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => (
      <Badge className={STAGE_COLORS[row.original.stage] ?? 'bg-muted text-muted-foreground'}>
        {formatStatus(row.original.stage)}
      </Badge>
    ),
  },
  {
    accessorKey: 'estimated_revenue',
    header: 'Est. Revenue',
    cell: ({ row }) =>
      row.original.estimated_revenue ? `$${row.original.estimated_revenue.toLocaleString()}` : '-',
  },
  {
    accessorKey: 'probability_pct',
    header: 'Probability',
    cell: ({ row }) =>
      row.original.probability_pct != null ? `${row.original.probability_pct}%` : '-',
  },
  {
    accessorKey: 'target_close_date',
    header: 'Close Date',
    cell: ({ row }) =>
      row.original.target_close_date
        ? new Date(row.original.target_close_date).toLocaleDateString('en-CA', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '-',
  },
];

export function OpportunitiesTable() {
  const { activeDivision } = useDivision();
  const { push: orgPush } = useOrgRouter();
  const deleteOpp = useDeleteOpportunity();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);

  const { data: response, isLoading } = useOpportunities({
    divisionId: getDivisionFilter(activeDivision),
    limit: pageSize,
    offset: page * pageSize,
  });
  const opportunities = response?.data ?? [];
  const total = response?.total ?? 0;

  const columns: ColumnDef<Opportunity, unknown>[] = [
    ...BASE_COLUMNS,
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActionMenu
          entityName={row.original.opportunity_name}
          onEdit={() => orgPush(`/crm/opportunities/${row.original.id}`)}
          onDelete={() => deleteOpp.mutate(row.original.id)}
        />
      ),
    },
  ];

  return (
    <DataTable<Opportunity>
      columns={columns}
      data={opportunities}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSortChange={setSort}
      currentSort={sort}
      onRowClick={(opp) => orgPush(`/crm/opportunities/${opp.id}`)}
      isLoading={isLoading}
    />
  );
}
