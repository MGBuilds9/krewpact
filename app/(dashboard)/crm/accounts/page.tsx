'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Building2 } from 'lucide-react';
import { useAccounts, type Account } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { ViewToggle, useViewMode } from '@/components/CRM/ViewToggle';
import type { ColumnDef } from '@tanstack/react-table';

const accountColumns: ColumnDef<Account, unknown>[] = [
  {
    accessorKey: 'account_name',
    header: 'Account Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.account_name}</span>
    ),
  },
  {
    accessorKey: 'account_type',
    header: 'Type',
    cell: ({ row }) => (
      <span className="capitalize">{row.original.account_type || '-'}</span>
    ),
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

const ACCOUNT_TYPES = ['client', 'prospect', 'partner', 'vendor', 'subcontractor'];

export default function AccountsPage() {
  const router = useRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [viewMode, setViewMode] = useViewMode();

  const { data: response, isLoading } = useAccounts({
    divisionId: activeDivision?.id,
    accountType: typeFilter !== 'all' ? typeFilter : undefined,
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort?.field,
    sortDir: sort?.direction,
  });

  const accounts = response?.data ?? [];
  const total = response?.total ?? 0;

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
      <title>Accounts — KrewPact</title>
      <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground text-sm">
              {total} account{total !== 1 ? 's' : ''}
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
        <Button onClick={() => router.push('/crm/accounts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Content */}
      {accounts.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first account to organize your contacts and opportunities
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
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
          onRowClick={(account) => router.push(`/crm/accounts/${account.id}`)}
          isLoading={isLoading}
        />
      ) : (
        <>
          <div className="grid gap-3">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/crm/accounts/${account.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{account.account_name}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        {account.account_type && (
                          <span className="capitalize">{account.account_type}</span>
                        )}
                        <span>
                          {new Date(account.created_at).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
              {total > 0 ? `Showing ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} of ${total}` : 'No results'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / pageSize) - 1}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}
