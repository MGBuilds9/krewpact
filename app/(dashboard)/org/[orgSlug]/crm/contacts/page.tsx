'use client';

import { useState } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Users, Mail, Phone } from 'lucide-react';
import { useContacts, type Contact } from '@/hooks/useCRM';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { ViewToggle, useViewMode } from '@/components/CRM/ViewToggle';
import type { ColumnDef } from '@tanstack/react-table';

const contactColumns: ColumnDef<Contact, unknown>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </span>
        {row.original.is_primary && (
          <Badge variant="outline" className="text-xs border-primary text-primary">
            Primary
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email || '-',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.original.phone || '-',
  },
  {
    accessorKey: 'role_title',
    header: 'Role',
    cell: ({ row }) => row.original.role_title || '-',
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

export default function ContactsPage() {
  const { push: orgPush } = useOrgRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [viewMode, setViewMode] = useViewMode();

  const { data: response, isLoading } = useContacts({
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: page * pageSize,
    sortBy: sort?.field,
    sortDir: sort?.direction,
  });

  const contacts = response?.data ?? [];
  const total = response?.total ?? 0;

  if (isLoading && !response) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 animate-pulse" />
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
      <title>Contacts — KrewPact</title>
      <div className="space-y-4">
        {/* Header */}
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

        {/* Filters */}
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

        {/* Content */}
        {contacts.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
              <p className="text-muted-foreground mb-4">
                Contacts are added through accounts or created directly
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <DataTable<Contact>
            columns={contactColumns}
            data={contacts}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            currentSort={sort}
            onRowClick={(contact) => orgPush(`/crm/contacts/${contact.id}`)}
            isLoading={isLoading}
          />
        ) : (
          <>
            <div className="grid gap-3">
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => orgPush(`/crm/contacts/${contact.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.is_primary && (
                            <span className="text-xs text-primary font-medium">Primary</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {contact.role_title && <span>{contact.role_title}</span>}
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
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
      </div>
    </>
  );
}
