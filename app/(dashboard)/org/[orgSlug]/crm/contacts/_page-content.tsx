'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { BulkActionBar } from '@/components/CRM/BulkActionBar';
import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { useViewMode, ViewToggle } from '@/components/CRM/ViewToggle';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { type Contact, useContacts, useDeleteContact } from '@/hooks/useCRM';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { ContactCardView, contactColumns } from './_components/ContactsContent';

// eslint-disable-next-line max-lines-per-function
export default function ContactsPage() {
  const { push: orgPush } = useOrgRouter();
  const queryClient = useQueryClient();
  const deleteContact = useDeleteContact();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [viewMode, setViewMode] = useViewMode();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: response, isLoading } = useContacts({
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort?.field,
    sortDir: sort?.direction,
  });
  const contacts = useMemo(() => response?.data ?? [], [response]);
  const total = response?.total ?? 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(selectedIds.length === contacts.length ? [] : contacts.map((c) => c.id));
  }, [selectedIds.length, contacts]);

  const columns: ColumnDef<Contact, unknown>[] = [
    ...contactColumns,
    {
      id: 'actions',
      cell: ({ row }) => (
        <RowActionMenu
          entityName={`${row.original.first_name} ${row.original.last_name}`}
          onEdit={() => orgPush(`/crm/contacts/${row.original.id}`)}
          onDelete={() => deleteContact.mutate(row.original.id)}
        />
      ),
    },
  ];

  if (isLoading && !response) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 animate-pulse" />
        <div className="grid gap-4">
          {['s1', 's2', 's3'].map((k) => (
            <Skeleton key={k} className="h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
              <p className="text-muted-foreground text-sm">
                {total} contact{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Button onClick={() => orgPush('/crm/contacts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Button>
        </div>
        {contacts.length === 0 && !isLoading ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No contacts yet"
            description="Add your first contact to manage relationships and communication."
            action={
              <Button onClick={() => orgPush('/crm/contacts/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Contact
              </Button>
            }
          />
        ) : viewMode === 'table' ? (
          <DataTable<Contact>
            columns={columns}
            data={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            currentSort={sort}
            onRowClick={(c) => orgPush(`/crm/contacts/${c.id}`)}
            isLoading={isLoading}
          />
        ) : (
          <ContactCardView
            contacts={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            onNavigate={(id) => orgPush(`/crm/contacts/${id}`)}
            onPageChange={setPage}
            onDelete={(id) => deleteContact.mutate(id)}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        )}
        <BulkActionBar
          selectedIds={selectedIds}
          entityType="contact"
          onClearSelection={() => setSelectedIds([])}
          onActionComplete={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
        />
      </div>
    </>
  );
}
