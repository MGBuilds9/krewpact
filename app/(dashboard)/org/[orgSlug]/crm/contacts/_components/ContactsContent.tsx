'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Mail, Phone } from 'lucide-react';

import { RowActionMenu } from '@/components/CRM/RowActionMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type Contact } from '@/hooks/useCRM';

export const contactColumns: ColumnDef<Contact, unknown>[] = [
  {
    id: 'name',
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.first_name} {row.original.last_name}</span>
        {row.original.is_primary && <Badge variant="outline" className="text-xs border-primary text-primary">Primary</Badge>}
      </div>
    ),
  },
  { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '-' },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '-' },
  { accessorKey: 'role_title', header: 'Role', cell: ({ row }) => row.original.role_title || '-' },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
  },
];

interface ContactCardProps {
  contact: Contact;
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function ContactCard({ contact, onNavigate, onDelete, selected, onToggleSelect }: ContactCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(contact.id)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {onToggleSelect && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(contact.id)} aria-label={`Select ${contact.first_name} ${contact.last_name}`} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{contact.first_name} {contact.last_name}</h3>
              {contact.is_primary && <span className="text-xs text-primary font-medium">Primary</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {contact.role_title && <span>{contact.role_title}</span>}
              {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionMenu entityName={`${contact.first_name} ${contact.last_name}`} onEdit={() => onNavigate(contact.id)} onDelete={() => onDelete(contact.id)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ContactCardViewProps {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  onNavigate: (id: string) => void;
  onPageChange: (p: number) => void;
  onDelete: (id: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function ContactCardView({
  contacts, total, page, pageSize, onNavigate, onPageChange, onDelete, selectedIds, onToggleSelect, onToggleSelectAll,
}: ContactCardViewProps) {
  const pageCount = Math.ceil(total / pageSize);
  const allSelected = contacts.length > 0 && selectedIds?.length === contacts.length;
  return (
    <>
      {onToggleSelectAll && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} aria-label="Select all contacts" />
          <span className="text-xs text-muted-foreground">Select all</span>
        </div>
      )}
      <div className="grid gap-3">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} onNavigate={onNavigate} onDelete={onDelete} selected={selectedIds?.includes(contact.id)} onToggleSelect={onToggleSelect} />
        ))}
      </div>
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-muted-foreground">
          {total > 0 ? `Showing ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} of ${total}` : 'No results'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 0}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1}>Next</Button>
        </div>
      </div>
    </>
  );
}
