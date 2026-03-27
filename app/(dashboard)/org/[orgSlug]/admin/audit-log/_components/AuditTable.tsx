'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZES = [25, 50, 100];
const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' });
}
function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {['f-1', 'f-2', 'f-3', 'f-4'].map((id) => (
          <Skeleton key={id} className="h-10 w-full sm:w-40" />
        ))}
      </div>
      <div className="space-y-2">
        {['r-1', 'r-2', 'r-3', 'r-4', 'r-5', 'r-6', 'r-7', 'r-8'].map((id) => (
          <Skeleton key={id} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export interface AuditTableProps {
  loading: boolean;
  entries: AuditEntry[];
  page: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
  resolveUser: (userId: string) => string;
}

export function AuditTable({
  loading,
  entries,
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  resolveUser,
}: AuditTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Showing page {page} of {totalPages}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-xs text-muted-foreground">
              Per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSkeleton />
        ) : entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No audit entries found</p>
            <p className="text-muted-foreground text-xs mt-1">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  {['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Details'].map(
                    (h) => (
                      <th key={h} className="pb-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2 whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-2 text-sm">{resolveUser(entry.user_id)}</td>
                    <td className="py-2">
                      <Badge variant={ACTION_VARIANTS[entry.action] || 'outline'}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="py-2">{formatEntityType(entry.entity_type)}</td>
                    <td className="py-2">{entry.entity_name || '—'}</td>
                    <td className="py-2 max-w-[200px] truncate text-xs text-muted-foreground">
                      {entry.details ? JSON.stringify(entry.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && entries.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={page <= 1}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={onNext}
              disabled={page >= totalPages}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
