'use client';

import { Building2, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import type { SortState } from '@/components/CRM/DataTable';
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
import { useAccounts } from '@/hooks/useCRM';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { AccountsBody } from './AccountsViewParts';

const ACCOUNT_TYPES = ['client', 'prospect', 'partner', 'vendor', 'subcontractor'];

export default function AccountsView() {
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
  const { data: response, isLoading } = useAccounts({
    divisionId,
    accountType: typeFilter !== 'all' ? typeFilter : undefined,
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort?.field,
    sortDir: sort?.direction,
  });

  const accounts = response?.data || [];
  const total = response?.total || 0;

  return (
    <div className="space-y-4">
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
  );
}
