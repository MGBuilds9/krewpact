'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
}: {
  account: Account;
  onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate(account.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
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
}

export function AccountCardView({
  accounts,
  total,
  page,
  pageSize,
  onNavigate,
  onPageChange,
  onDelete,
}: AccountCardViewProps) {
  const pageCount = Math.ceil(total / pageSize);
  return (
    <>
      <div className="grid gap-3">
        {accounts.map((account) => (
          <AccountCardItem
            key={account.id}
            account={account}
            onNavigate={onNavigate}
            onDelete={onDelete}
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

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first account to organize your contacts and opportunities
          </p>
        </CardContent>
      </Card>
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
    />
  );
}
