'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface StagingDoc {
  id: string;
  title: string;
  source_path: string | null;
  source_type: string;
  category: string | null;
  status: string;
  tags: string[];
  created_at: string;
  reviewed_at: string | null;
}

interface StagingListResponse {
  data: StagingDoc[];
  total: number;
  page: number;
  limit: number;
}
interface StagingTableProps {
  onSelect: (doc: StagingDoc) => void;
  selectedId?: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_edit', label: 'Needs Edit' },
  { value: 'ingested', label: 'Ingested' },
];

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
  needs_edit: 'secondary',
  ingested: 'default',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending_review: 'border-yellow-400 text-yellow-700 bg-yellow-50',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  needs_edit: 'bg-orange-100 text-orange-800 border-orange-300',
  ingested: 'bg-blue-100 text-blue-800 border-blue-300',
};

function DocRow({
  doc,
  isSelected,
  onSelect,
}: {
  doc: StagingDoc;
  isSelected: boolean;
  onSelect: (d: StagingDoc) => void;
}) {
  return (
    <button
      onClick={() => onSelect(doc)}
      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{doc.title}</p>
          {doc.source_path && (
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              {doc.source_path}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant={STATUS_BADGE_VARIANTS[doc.status] ?? 'outline'}
            className={`text-xs ${STATUS_BADGE_CLASSES[doc.status] ?? ''}`}
          >
            {doc.status.replace(/_/g, ' ')}
          </Badge>
          {doc.category && (
            <Badge variant="secondary" className="text-xs">
              {doc.category}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export function StagingTable({ onSelect, selectedId }: StagingTableProps) {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 25;
  const queryStatus = status === 'all' ? undefined : status;

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.executive.staging.list({ status: queryStatus, page }),
    queryFn: () =>
      apiFetch<StagingListResponse>('/api/executive/staging', {
        params: { ...(queryStatus ? { status: queryStatus } : {}), page, limit },
      }),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  function handleStatusChange(val: string) {
    setStatus(val);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-md" />
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-destructive">Failed to load staging documents.</p>}
      {data && (
        <div className="border rounded-md divide-y">
          {data.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No documents found.</p>
          )}
          {data.data.map((doc) => (
            <DocRow key={doc.id} doc={doc} isSelected={selectedId === doc.id} onSelect={onSelect} />
          ))}
        </div>
      )}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
