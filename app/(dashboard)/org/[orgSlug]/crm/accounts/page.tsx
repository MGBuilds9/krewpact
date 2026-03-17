'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { useViewMode, ViewToggle } from '@/components/CRM/ViewToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import { type Account, useAccounts } from '@/hooks/useCRM';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrgRouter } from '@/hooks/useOrgRouter';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const accountColumns: ColumnDef<Account, unknown>[] = [
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

const ACCOUNT_TYPES = ['client', 'prospect', 'partner', 'vendor', 'subcontractor'];

function AccountCardItem({
  account,
  onNavigate,
}: {
  account: Account;
  onNavigate: (id: string) => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate(account.id)}
    >
      <CardContent className="p-4">
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
}
function AccountCardView({
  accounts,
  total,
  page,
  pageSize,
  onNavigate,
  onPageChange,
}: AccountCardViewProps) {
  const pageCount = Math.ceil(total / pageSize);
  return (
    <>
      <div className="grid gap-3">
        {accounts.map((account) => (
          <AccountCardItem key={account.id} account={account} onNavigate={onNavigate} />
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
}
function AccountsBody({
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
}: AccountsBodyProps) {
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
        columns={accountColumns}
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
    />
  );
}

export default function AccountsPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [viewMode, setViewMode] = useViewMode();

  const divisionId = activeDivision ? activeDivision.id : undefined;
  const accountType = typeFilter !== 'all' ? typeFilter : undefined;
  const searchParam = debouncedSearch || undefined;
  const sortBy = sort ? sort.field : undefined;
  const sortDir = sort ? sort.direction : undefined;

  const { data: response, isLoading } = useAccounts({
    divisionId,
    accountType,
    search: searchParam,
    limit: pageSize,
    offset: page * pageSize,
    sortBy,
    sortDir,
  });

  const accounts = response ? response.data || [] : [];
  const total = response ? response.total || 0 : 0;
  const totalLabel = `${total} account${total !== 1 ? 's' : ''}`;

  if (isLoading && !response) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 animate-pulse" />
          <Skeleton className="h-10 w-36 animate-pulse" />
        </div>
        <div className="grid gap-4">
          {['sk1', 'sk2', 'sk3'].map((id) => (
            <Skeleton key={id} className="h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Accounts — KrewPact</title>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
              <p className="text-muted-foreground text-sm">{totalLabel}</p>
            </div>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => orgPush('/crm/accounts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
        <AccountsBody
          accounts={accounts}
          total={total}
          page={page}
          pageSize={pageSize}
          sort={sort}
          viewMode={viewMode}
          isLoading={isLoading}
          setPage={setPage}
          setPageSize={setPageSize}
          setSort={setSort}
          orgPush={orgPush}
        />
      </div>
    </>
  );
}
