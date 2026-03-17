'use client';

import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface AuditLogQuery {
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
}

interface AuditLogQueryFormProps {
  onQuery: (params: AuditLogQuery) => void;
}

export function AuditLogQueryForm({ onQuery }: AuditLogQueryFormProps) {
  const form = useForm<AuditLogQuery>({ defaultValues: {} });

  return (
    <form onSubmit={form.handleSubmit(onQuery)} className="grid grid-cols-3 gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Entity Type</label>
        <Input placeholder="e.g. project" {...form.register('entity_type')} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Action</label>
        <Input placeholder="e.g. update" {...form.register('action')} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Actor User ID</label>
        <Input placeholder="User UUID" {...form.register('actor_user_id')} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">From Date</label>
        <Input type="date" {...form.register('from_date')} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">To Date</label>
        <Input type="date" {...form.register('to_date')} />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          <Search className="mr-2 h-4 w-4" />
          Search Logs
        </Button>
      </div>
    </form>
  );
}
