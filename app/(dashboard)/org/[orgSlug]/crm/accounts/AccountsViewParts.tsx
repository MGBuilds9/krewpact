'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Plus } from 'lucide-react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Account } from '@/hooks/useCRM';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const accountColumns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: 'account_name',
    header: 'Account Name',
    cell: ({ row }) => <span className="font-medium">{row.original.account_name}</span>,
  },
  {
    accessorKey: 'account_type',
    header: 'Type',
    cell: ({ row }) => <span className="capitalize">{row.original.account_type || '-'}</span>,
  },
  {
    accessorKey: 'industry',
    header: 'Industry',
    cell: ({ row }) => <span>{row.original.industry || '-'}</span>,
  },
  {
    accessorKey: 'total_projects',
    header: 'Projects',
    cell: ({ row }) => <span>{row.original.total_projects ?? 0}</span>,
  },
  {
    accessorKey: 'is_repeat_client',
    header: 'Repeat Client',
    cell: ({ row }) =>
      row.original.is_repeat_client ? (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Repeat</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">-</span>
      ),
  },
  {
    accessorKey: 'last_project_date',
    header: 'Last Project',
    cell: ({ row }) => formatDate(row.original.last_project_date),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

export function AccountCardItem({
  account,
  onNavigate,
  onDelete,
  selected,
  onToggleSelect,
}: {
  account: Account;
  onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate(account.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {onToggleSelect && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center pt-0.5">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect(account.id)}
                aria-label={`Select ${account.account_name}`}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{account.account_name}</h3>
              {account.is_repeat_client && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs flex-shrink-0">
                  Repeat
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              {account.account_type && <span className="capitalize">{account.account_type}</span>}
              {account.industry && <span>{account.industry}</span>}
              {account.total_projects > 0 && (
                <span>
                  {account.total_projects} project{account.total_projects !== 1 ? 's' : ''}
                </span>
              )}
              {account.last_project_date && (
                <span>Last: {formatDate(account.last_project_date)}</span>
              )}
            </div>
          </div>
          {onDelete && (
            <div onClick={(e) => e.stopPropagation()}>
              <RowActionMenu
                entityName={account.account_name}
                onEdit={() => onNavigate(account.id)}
                onDelete={() => onDelete(account.id)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AccountCardViewProps {
  accounts: Account[];
  total: number;
  page: number;
  pageSize: number;
  onNavigate: (id: string) => void;
  onPageChange: (p: number) => void;
  onDelete?: (id: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function AccountCardView({
  accounts,
  total,
  page,
  pageSize,
  onNavigate,
  onPageChange,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: AccountCardViewProps) {
  const pageCount = Math.ceil(total / pageSize);
  const allSelected = accounts.length > 0 && selectedIds?.length === accounts.length;
  return (
    <>
      {onToggleSelectAll && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            aria-label="Select all accounts"
          />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}
      <div className="grid gap-3">
        {accounts.map((account) => (
          <AccountCardItem
            key={account.id}
            account={account}
            onNavigate={onNavigate}
            onDelete={onDelete}
            selected={selectedIds?.includes(account.id)}
            onToggleSelect={onToggleSelect}
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
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

interface AccountsBodyProps {
  accounts: Account[];
  total: number;
  page: number;
  pageSize: number;
  sort: SortState | null;
  viewMode: string;
  isLoading: boolean;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  setSort: (s: SortState | null) => void;
  orgPush: (path: string) => void;
  onDelete: (id: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function AccountsBody({
  accounts,
  total,
  page,
  pageSize,
  sort,
  viewMode,
  isLoading,
  setPage,
  setPageSize,
  setSort,
  orgPush,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: AccountsBodyProps) {
  const columns: ColumnDef<Account, unknown>[] = [
    ...accountColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActionMenu
          entityName={row.original.account_name}
          onEdit={() => orgPush(`/crm/accounts/${row.original.id}`)}
          onDelete={() => onDelete(row.original.id)}
        />
      ),
    },
  ];

  if (accounts.length === 0 && !isLoading) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12" />}
        title="No accounts yet"
        description="Create your first account to track clients, vendors, and partners."
        action={
          <Button onClick={() => orgPush('/crm/accounts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Account
          </Button>
        }
      />
    );
  }
  if (viewMode === 'table') {
    return (
      <DataTable<Account>
        columns={columns}
        data={accounts}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        currentSort={sort}
        onRowClick={(account) => orgPush(`/crm/accounts/${account.id}`)}
        isLoading={isLoading}
      />
    );
  }
  return (
    <AccountCardView
      accounts={accounts}
      total={total}
      page={page}
      pageSize={pageSize}
      onNavigate={(id) => orgPush(`/crm/accounts/${id}`)}
      onPageChange={setPage}
      onDelete={onDelete}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
    />
  );
}
